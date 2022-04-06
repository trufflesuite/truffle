const copyArtifactsToTempDir = async config => {
  const copy = require("../../copy");
  const fs = require("fs");
  const OS = require("os");
  const tmp = require("tmp");
  tmp.setGracefulCleanup();

  // Copy all the built files over to a temporary directory, because we
  // don't want to save any tests artifacts. Only do this if the build directory
  // exists.
  const temporaryDirectory = tmp.dirSync({
    unsafeCleanup: true,
    prefix: "test-"
  }).name;
  try {
    fs.statSync(config.contracts_build_directory);
  } catch (_error) {
    return { temporaryDirectory };
  }

  await copy(config.contracts_build_directory, temporaryDirectory);

  if (config.runnerOutputOnly !== true) {
    config.logger.log("Using network '" + config.network + "'." + OS.EOL);
  }
  return { temporaryDirectory };
};

module.exports = {
  copyArtifactsToTempDir
};
