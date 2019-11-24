const copyArtifactsToTempDir = async config => {
  const temp = require("temp").track();
  const { promisify } = require("util");
  const copy = require("../../copy");
  const fs = require("fs");
  const OS = require("os");
  // Copy all the built files over to a temporary directory, because we
  // don't want to save any tests artifacts. Only do this if the build directory
  // exists.
  const temporaryDirectory = temp.mkdirSync("test-");
  try {
    fs.statSync(config.contracts_build_directory);
  } catch (_error) {
    return { config, temporaryDirectory };
  }

  await promisify(copy)(config.contracts_build_directory, temporaryDirectory);
  if (config.runnerOutputOnly !== true) {
    config.logger.log("Using network '" + config.network + "'." + OS.EOL);
  }
  return { config, temporaryDirectory };
};

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

const prepareConfigAndRunTests = ({ config, temporaryDirectory, files }) => {
  const Artifactor = require("@truffle/artifactor");
  const Test = require("../../test");
  // Set a new artifactor; don't rely on the one created by Environments.
  // TODO: Make the test artifactor configurable.
  config.artifactor = new Artifactor(temporaryDirectory);

  const testConfig = config.with({
    test_files: files,
    contracts_build_directory: temporaryDirectory
  });
  return Test.run(testConfig);
};

module.exports = {
  copyArtifactsToTempDir,
  determineTestFilesToRun,
  prepareConfigAndRunTests
};
