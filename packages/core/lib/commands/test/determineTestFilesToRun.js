const path = require("path");
const fs = require("fs");
const glob = require("glob");
const walkdir = require("walkdir");

const determineTestFilesToRun = ({ inputFile, inputArgs = [], config }) => {
  let filesToRun = [];
  if (inputFile) {
    filesToRun.push(inputFile);
  } else if (inputArgs.length > 0) {
    for (let fileOrDir of inputArgs) {
      const results = walkdir.sync(fileOrDir, { follow_symlinks: true });
      for (let fileOrDir of results) {
        const isFile = fs.statSync(fileOrDir).isFile();
        if (isFile) {
          filesToRun.push(fileOrDir);
        }
      }
    }
  }
  if (filesToRun.length === 0) {
    const directoryContents = glob.sync(
      `${config.test_directory}${path.sep}**${path.sep}*`
    );
    filesToRun =
      directoryContents.filter(item => fs.statSync(item).isFile()) || [];
  }
  return filesToRun.filter(file => {
    return file.match(config.test_file_extension_regexp) !== null;
  });
};

module.exports = {
  determineTestFilesToRun
};

