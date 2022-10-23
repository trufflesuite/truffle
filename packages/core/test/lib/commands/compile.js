const assert = require("chai").assert;
const WorkflowCompile = require("@truffle/workflow-compile").default;
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/compile");
const path = require("path");
const fse = require("fs-extra");
const { createTestProject } = require("../../helpers");
let config;
let output = "";
let memStream;

describe("compile", function () {
  before(function () {
    config = createTestProject(path.join(__dirname, "../../sources/metacoin"));
    config.logger = { log: val => val && memStream.write(val) };
  });

  afterEach(() => (output = ""));

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
    const stat = fse.statSync(fileToUpdate);

    // Update the modification time to simulate an edit.
    const newTime = new Date().getTime();
    fse.utimesSync(fileToUpdate, newTime, newTime);

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
    fse.utimesSync(fileToUpdate, stat.atime, stat.mtime);
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
      this.timeout(
        60000 * 2  // oh boy!
      );
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
      const sources = ["OtherContract.sol", "MetaCoin.sol", "ConvertLib.sol"];
      for (const source of sources) {
        const filename = path.join(config.contracts_directory, source);
        const contents = fse.readFileSync(filename).toString();
        // make a trivial update to each file
        fse.writeFileSync(filename, `${contents}\n`);
      }

      const { contracts } = await WorkflowCompile.compileAndSave(
        config.with({
          all: false,
          quiet: true,
          paths: [path.resolve(config.contracts_directory, "OtherContract.sol")]
        })
      );

      // confirm it didn't compile all contracts
      assert.equal(
        Object.keys(contracts).length,
        1,
        "Didn't compile specified contract."
      );
    });
  });
});
