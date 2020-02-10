const assert = require("chai").assert;
const Box = require("@truffle/box");
const TestHelpers = require("@truffle/core/lib/commands/test/helpers");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver");
const MemoryStream = require("memorystream");
const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");

let config;
output = "";

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
