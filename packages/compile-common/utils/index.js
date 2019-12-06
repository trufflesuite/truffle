const { promisify } = require("util");
const findContracts = promisify(require("@truffle/contract-sources"));
const expect = require("@truffle/expect");
const readAndParseArtifactFiles = require("./readAndParseArtifactFiles");
const minimumUpdatedTimePerSource = require("./minimumUpdatedTimePerSource");
const findUpdatedFiles = require("./findUpdatedFiles");

// Compares contract files to their artifact counterparts,
// determines which contract files have been updated.
const updatedFiles = async options => {
  expect.options(options, ["resolver"]);

  const { contracts_directory, contracts_build_directory } = options;

  getFiles = async () => {
    if (options.files) return options.files;
    else return findContracts(contracts_directory);
  };

  let sourceFilesArtifacts = {};
  let sourceFilesArtifactsUpdatedTimes = {};

  try {
    const sourceFiles = await getFiles();
    sourceFilesArtifacts = readAndParseArtifactFiles(
      sourceFiles,
      contracts_build_directory
    );
    sourceFilesArtifactsUpdatedTimes = minimumUpdatedTimePerSource(
      sourceFilesArtifacts
    );
    const updatedFiles = findUpdatedFiles(
      sourceFilesArtifacts,
      sourceFilesArtifactsUpdatedTimes
    );
    return updatedFiles;
  } catch (error) {
    throw error;
  }
};

module.exports = updatedFiles;
