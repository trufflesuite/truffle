const colors = require("colors");
const generateDebug = function ({ mochaRunner, compilations, config }) {
  return async operation => {
    if (!config.debug) {
      config.logger.log(
        `${colors.bold(
          "Warning:"
        )} Invoked in-test debugger without --debug flag. ` +
          `Try: \`truffle test --debug\``
      );
      return operation;
    }

    // wrapped inside function so as not to load debugger on every test
    const { CLIDebugHook } = require("../../debug/mocha");

    const hook = new CLIDebugHook(config, compilations, mochaRunner);

    return await hook.debug(operation);
  };
};

const prepareConfigAndRunTests = ({ config, temporaryDirectory, files }) => {
  const Artifactor = require("@truffle/artifactor");
  const { Test } = require("@truffle/test");
  // Set a new artifactor; don't rely on the one created by Environments.
  // TODO: Make the test artifactor configurable.
  config.artifactor = new Artifactor(temporaryDirectory);

  const testConfig = config.with({
    test_files: files,
    contracts_build_directory: temporaryDirectory
  });

  return Test.run(testConfig, generateDebug);
};

module.exports = {
  prepareConfigAndRunTests
};
