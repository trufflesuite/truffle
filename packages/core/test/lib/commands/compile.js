const assert = require("chai").assert;
const Box = require("@truffle/box");
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

  after("Cleanup tmp files", function (done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  afterEach("Clear MemoryStream", () => (output = ""));

  it("compiles all initial contracts", async function () {
    this.timeout(10000);
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
    this.timeout(10000);
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
    this.timeout(10000);

    var file_to_update = path.resolve(
      path.join(config.contracts_directory, "ConvertLib.sol")
    );
    var stat = fs.statSync(file_to_update);

    // Update the modification time to simulate an edit.
    var newTime = new Date().getTime();
    fs.utimesSync(file_to_update, newTime, newTime);

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
    fs.utimesSync(file_to_update, stat.atime, stat.mtime);
  });

  it("compiling shouldn't create any network artifacts", function () {
    var contract = config.resolver.require("MetaCoin.sol");
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

    it("prints a truncated list of solcjs versions", function (done) {
      this.timeout(5000);

      const options = {
        list: ""
      };

      command.run(config.with(options), err => {
        if (err) return done(err);

        memStream.on("end", function () {
          const arr = JSON.parse(output);
          assert(arr.length === 11);
          done();
        });

        memStream.end("");
      });
    });

    it("prints a list of docker tags", function (done) {
      this.timeout(20000);

      const options = {
        list: "docker"
      };

      command.run(config.with(options), err => {
        if (err) return done(err);

        memStream.on("end", function () {
          const arr = JSON.parse(output);
          assert(arr.length === 11);
          assert(typeof arr[0] === "string");
          done();
        });

        memStream.end("");
      });
    });

    it("prints a full list of releases when --all is set", function (done) {
      this.timeout(5000);

      const options = {
        list: "releases",
        all: true
      };

      command.run(config.with(options), err => {
        if (err) return done(err);

        memStream.on("end", function () {
          const arr = JSON.parse(output);
          assert(arr.length > 11);
          assert(typeof arr[0] === "string");
          done();
        });

        memStream.end("");
      });
    });
  });
}).timeout(10000);
