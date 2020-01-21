const assert = require("chai").assert;
const Box = require("@truffle/box");

const Contracts = require("@truffle/workflow-compile");
const Test = require("@truffle/core/lib/test");
const TestCommand = require("@truffle/core/lib/commands/test");
const TestHelpers = require("@truffle/core/lib/commands/test/helpers");
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

  //   Commenting it because it causes error as described in #469
  //   it("Run test. It should not compile any file because all files were just built.", async function() {
  //     this.timeout(10000);
  //     const solidityTestFiles = [];
  //     var { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
  //       solidityTestFiles,
  //       config.with({
  //         compileAll: true,
  //         compileNone: false,
  //         quiet: false,
  //         test_files: solidityTestFiles
  //       }),
  //       config.resolver
  //     );

  //     assert.equal(
  //       compilations.solc.contracts.length,
  //       0,
  //       "It should compile 0 files because 3 files has just been compiled."
  //     );
  //   });

  it("Check test with subdirectories", function(done) {
    let testFiles = TestHelpers.determineTestFilesToRun({ config });
    let testFilesCount = testFiles.length;

    let filename = path.join(
      config.test_directory,
      "sub_directory",
      "test.sol"
    );
    fs.createFileSync(filename);

    filename = path.join(config.test_directory, "sub_directory", "test.js");
    fs.createFileSync(filename);

    filename = path.join(
      config.test_directory,
      "sub_directory",
      "sub_sub_directory",
      "test.js"
    );
    fs.createFileSync(filename);

    let dirName = path.join(
      config.test_directory,
      "sub_directory",
      "empty_sub_directory"
    );

    // Create empty subdirectory to check if
    // determineTestFilesTo run function can process it without crashing
    fs.ensureDirSync(dirName);

    let newTestFiles = TestHelpers.determineTestFilesToRun({ config });
    assert.equal(
      newTestFiles.length,
      testFilesCount + 3,
      "Wrong number of files discovered"
    );

    done();
  });

  it("Check if  files are picked from subdirectories in test directory.", function(done) {
    this.timeout(1000);
    // This allows to create customized directory structure to test more than one level of sub directories.
    let fileStructrure = {
      name: "sub_directory",
      files: ["test1.sol", "test2.js"],
      subdirs: [
        {
          name: "sub_sub_directory",
          files: ["test3.sol", "test4.js"]
        },
        {
          name: "sub_sub_directory2",
          files: ["test5.js", "test6.sol", "test7.sol"],
          subdirs: [
            {
              name: "one_more_sub",
              files: [
                "test8.sol",
                "test9.sol",
                "test10.sol",
                "test10.sol",
                "test11.sol"
              ]
            },
            {
              name: "one_more_sub2",
              files: [
                "test12.sol",
                "test13.sol",
                "test14.sol",
                "test14.sol",
                "test15.sol"
              ],
              subdirs: [
                {
                  name: "solidity_only_subdir",
                  files: ["test16.sol", "test17.sol", "test18.sol"]
                },
                {
                  name: "js_only_subdir",
                  files: ["test19.js", "test19.js", "test20.js"]
                },
                {
                  name: "empty_sub_sub_directory",
                  files: []
                }
              ]
            }
          ]
        }
      ]
    };

    // Create file in recursion. Used instead foreach since foreach loop doesn't wait for files to be created
    // Function does not count already existing files.
    function createFile(dirName, files, index) {
      // return zero if there are no files to create
      if (!files[index]) return 0;
      var fileName = path.join(dirName, files[index]);
      let filesCount = 0;
      if (!fs.existsSync(fileName)) {
        fs.createFileSync(fileName);
        filesCount++;
      }
      if (files.length > index + 1) {
        filesCount += createFile(dirName, files, index + 1);
      }

      return filesCount;
    }

    // Create files using dirStruct object. Count newly created files and skip existing files.
    // Returns number of new files.
    function createTestSubDir(dirName, dirStruct) {
      var numOfFiles = 0;

      numOfFiles = createFile(dirName, dirStruct.files, 0);

      if (dirStruct.subdirs) {
        dirStruct.subdirs.forEach(val => {
          numOfFiles += createTestSubDir(
            path.join(dirName, dirStruct.name, val.name),
            val
          );
        });
      }
      return numOfFiles;
    }

    // Call method used by Test to discover existing test files. Then create subdirectories and test files in these
    // subdirectories. Then run Test method again and check if number discovered increased.
    let testFiles = TestHelpers.determineTestFilesToRun({ config });
    let testFilesCount = testFiles.length;

    let newTestFiles = createTestSubDir(config.test_directory, fileStructrure);

    testFiles = TestHelpers.determineTestFilesToRun({ config });
    assert.equal(
      testFiles.length,
      testFilesCount + newTestFiles,
      "Wrong number of files discovered"
    );
    done();
  });

}).timeout(1000);
