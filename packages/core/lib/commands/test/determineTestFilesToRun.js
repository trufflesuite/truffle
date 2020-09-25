const determineTestFilesToRun = ({ inputFile, inputArgs = [], config }) => {
  const path = require("path");
  const fs = require("fs");
  const glob = require("glob");
  let filesToRun = [];

  if (inputFile) {
    filesToRun.push(inputFile);
  } else if (inputArgs.length > 0) {
    inputArgs.forEach(inputArg => filesToRun.push(inputArg));
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
