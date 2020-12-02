const prepareConfigAndRunTests = ({ config, temporaryDirectory, files }) => {
  const Artifactor = require("@truffle/artifactor");
  const Test = require("../../testing/Test");
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
  prepareConfigAndRunTests
};
