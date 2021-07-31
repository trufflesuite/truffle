const assert = require("chai").assert;
const { default: Box } = require("@truffle/box");
const WorkflowCompile = require("@truffle/workflow-compile");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver");
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/compile");
const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");
let config;
let output = "";
let memStream;

describe("compile", function () {
  before("Create a sandbox", async () => {
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.networks = {
      default: {
        network_id: "1"
      },
      secondary: {
        network_id: "12345"
      }
    };
    config.network = "default";
    config.logger = { log: val => val && memStream.write(val) };
  });

  after("Cleanup tmp files", async function () {
    const files = glob.sync("tmp-*");
    files.forEach(file => fs.removeSync(file));
  });

  afterEach("Clear MemoryStream", () => (output = ""));

  it("compiles all initial contracts", async function () {
    const { contracts } = await WorkflowCompile.compileAndSave(
      config.with({
        all: false,
        quiet: true
      })
    );
    assert.equal(
      Object.keys(contracts).length,
      3,
      "Didn't compile the expected number of contracts"
    );
  });

  it("compiles no contracts after no updates", async function () {
    const { contracts } = await WorkflowCompile.compileAndSave(
      config.with({
        all: false,
        quiet: true
      })
    );
    assert.equal(
      Object.keys(contracts).length,
      0,
      "Compiled a contract even though we weren't expecting it"
    );
  });

  it("compiles updated contract and its ancestors", async function () {
    const fileToUpdate = path.resolve(
      path.join(config.contracts_directory, "ConvertLib.sol")
    );
    const stat = fs.statSync(fileToUpdate);

    // Update the modification time to simulate an edit.
    const newTime = new Date().getTime();
    fs.utimesSync(fileToUpdate, newTime, newTime);

    const { contracts } = await WorkflowCompile.compileAndSave(
      config.with({
        all: false,
        quiet: true
      })
    );
    assert.equal(
      Object.keys(contracts).length,
      2,
      "Expected MetaCoin and ConvertLib to be compiled"
    );

    // reset time
    fs.utimesSync(fileToUpdate, stat.atime, stat.mtime);
  });

  it("compiling shouldn't create any network artifacts", function () {
    const contract = config.resolver.require("MetaCoin.sol");
    assert.equal(
      Object.keys(contract.networks).length,
      0,
      "Expected the contract to be managing zero networks"
    );
  });

  describe("solc listing options", function () {
    beforeEach(() => {
      memStream = new MemoryStream();
      memStream.on("data", function (data) {
        output += data.toString();
      });
    });

    it("prints a truncated list of solcjs versions", async function () {
      const options = {
        list: ""
      };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length === 10);
      });
      memStream.end("");
    });

    it("prints a list of docker tags", async function () {
      const options = {
        list: "docker"
      };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length === 11);
        assert(typeof arr[0] === "string");
      });
      memStream.end("");
    });

    it("prints a full list of releases when --all is set", async function () {
      const options = {
        list: "releases",
        all: true
      };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length > 11);
        assert(typeof arr[0] === "string");
      });
      memStream.end("");
    });
  });
});
