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
      fileOrDir = path.join(fileOrDir);
      walkdir.sync(fileOrDir, { follow_symlinks: true }, function (path, stat) {
        const isFile = fs.statSync(path).isFile();
        if (isFile) {
          filesToRun.push(path);
        }
      });
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

