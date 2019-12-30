const assert = require("chai").assert;
const Box = require("@truffle/box");
const Contracts = require("@truffle/workflow-compile");
const Test = require("@truffle/core/lib/test");
const TestCommand = require("@truffle/core/lib/commands/test");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver");
const MemoryStream = require("memorystream");
const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");
let config;
output = "";

function updateFile(filename) {
  var file_to_update = path.resolve(
    path.join(config.contracts_directory, filename)
  );

  // Update the modification time to simulate an edit.
  var newTime = new Date().getTime();
  fs.utimesSync(file_to_update, newTime, newTime);
}

describe("test command", function() {
  this.timeout(10000);
  var memStream;
  before("Create a sandbox", async () => {
    this.timeout(10000);
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

  beforeEach(() => {
    this.timeout(10000);
    memStream = new MemoryStream();
    memStream.on("data", function(data) {
      output += data.toString();
    });
  });

  after("Cleanup tmp files", function(done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  afterEach("Clear MemoryStream", () => (output = ""));

  it("run test with --compile-none flag", async function() {
    this.timeout(10000);
    const solidityTestFiles = [];

    var { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
      solidityTestFiles,
      config.with({
        all: false,
        compileNone: true,
        quiet: false,
        test_files: solidityTestFiles
      }),
      config.resolver
    );
    assert.equal(
      compilations.solc.contracts.length,
      0,
      "It should try to compile 0 contracts With compileNone == false"
    );
  });

  it("run test WITHOUT --compile-none flag", async function() {
    const solidityTestFiles = [];

    var { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
      solidityTestFiles,
      config.with({
        all: false,
        compileNone: false,
        quiet: false,
        test_files: solidityTestFiles
      }),
      config.resolver
    );
    assert.equal(
      compilations.solc.contracts.length,
      3,
      "It should compile 3 contracts With compileNone == true"
    );
  });

  it("check command with --compile-all and --compile-none", function(done) {
    const solidityTestFiles = [];
    assert.throw(function() {
      TestCommand.run(
        config.with({
          all: false,
          compileNone: true,
          compileAll: true,
          quiet: false,
          test_files: solidityTestFiles
        }),
        done
      );
    }, "Command line error");
    done();
  });

  it("compiles all initial contracts", function(done) {
    this.timeout(10000);

    Contracts.compile(
      config.with({
        all: false,
        quiet: true
      }),
      function(err, result) {
        if (err) return done(err);
        let { contracts } = result;

        assert.equal(
          Object.keys(contracts).length,
          0,
          "Should compile zero contracts. Test command was run before and everything should be up to date"
        );
        done();
      }
    );
  });

  it("run test without --compile-none flag after running build", async function() {
    this.timeout(10000);
    const solidityTestFiles = [];

    var { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
      solidityTestFiles,
      config.with({
        all: false,
        compileNone: false,
        quiet: false,
        test_files: solidityTestFiles
      }),
      config.resolver
    );
    assert.equal(
      compilations.solc.contracts.length,
      0,
      "It should try to compile 0 contracts With compileNone == false. Because there are no updated files."
    );
  });

  it("run test after updating one contract.", async function() {
    this.timeout(10000);

    updateFile("ConvertLib.sol");

    const solidityTestFiles = [];

    var { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
      solidityTestFiles,
      config.with({
        all: false,
        compileNone: false,
        quiet: false,
        test_files: solidityTestFiles
      }),
      config.resolver
    );
    assert.equal(
      compilations.solc.contracts.length,
      2,
      "It should compile 2 files, updated file and its ancestor,  and --compile-none is not set."
    );
  });

  it("Update all contracts and build it.", function(done) {
    this.timeout(10000);

    updateFile("ConvertLib.sol");
    updateFile("MetaCoin.sol");
    updateFile("Migrations.sol");

    Contracts.compile(
      config.with({
        all: false,
        quiet: false
      }),
      function(err, result) {
        if (err) return done(err);
        let { contracts } = result;
        assert.equal(
          Object.keys(contracts).length,
          3,
          "Should compile 3 contracts."
        );
        done();
      }
    );
  });

  it("Run test. It should not compile any file because all files were just built.", async function() {
    this.timeout(10000);
    const solidityTestFiles = [];
    var { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
      solidityTestFiles,
      config.with({
        compileAll: true,
        compileNone: false,
        quiet: false,
        test_files: solidityTestFiles
      }),
      config.resolver
    );

    assert.equal(
      compilations.solc.contracts.length,
      0,
      "It should compile 0 files because 3 files has just been compiled."
    );
  });
}).timeout(1000);
