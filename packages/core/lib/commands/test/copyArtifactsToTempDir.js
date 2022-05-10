const copyArtifactsToTempDir = async config => {
  const fse = require("fs-extra");
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
    fse.statSync(config.contracts_build_directory);
  } catch (_error) {
    return { temporaryDirectory };
  }

  fse.copySync(config.contracts_build_directory, temporaryDirectory);

  if (config.runnerOutputOnly !== true) {
    config.logger.log("Using network '" + config.network + "'." + OS.EOL);
  }
  return { temporaryDirectory };
};

module.exports = {
  copyArtifactsToTempDir
};
