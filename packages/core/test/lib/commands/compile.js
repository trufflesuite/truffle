const assert = require("chai").assert;
const WorkflowCompile = require("@truffle/workflow-compile");
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/compile");
const path = require("path");
const fs = require("fs-extra");
const tmp = require("tmp");
const copy = require("../../../lib/copy");
const Config = require("@truffle/config");
let tempDir;
let config;
let output = "";
let memStream;

describe("compile", function () {
  before("create a test project", async () => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    await copy(path.join(__dirname, "../../sources/metacoin"), tempDir.name);
    config = new Config(undefined, tempDir.name);
    config.logger = { log: val => val && memStream.write(val) };
  });

  after("cleanup tmp files", async function () {
    tempDir.removeCallback();
  });

  afterEach("clear MemoryStream", () => (output = ""));

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
      const options = { list: "" };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length === 10);
      });
      memStream.end("");
    });

    it("prints a list of docker tags", async function () {
      this.timeout(8000);
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

  describe("compiling specific sources", function () {
    it("compiles one specified contract after three are updated", async function () {
      this.timeout(10000);
      // update all three files
      const sources = ["ConvertLib.sol", "MetaCoin.sol", "Migrations.sol"];
      for (const source of sources) {
        const filename = path.join(config.contracts_directory, source);
        const contents = fs.readFileSync(filename).toString();
        // make a trivial update to each file
        fs.writeFileSync(filename, `${contents}\n`);
      }

      const { contracts } = await WorkflowCompile.compileAndSave(
        config.with({
          all: false,
          quiet: true,
          paths: [path.resolve(config.contracts_directory, "ConvertLib.sol")]
        })
      );

      // confirm it didn't compile all contracts
      assert.equal(
        Object.keys(contracts).length,
        2, //ConvertLib.sol is imported by MetaCoin.sol so there should be two files.
        "Didn't compile specified contracts."
      );
    });
  });
});
