module.exports = async function (buildDir, options) {
  const Artifactor = require("@truffle/artifactor");
  const { Resolver } = require("@truffle/resolver");
  const Migrate = require("@truffle/migrate").default;
  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");

  let accept = true;

  if (options.interactive) {
    accept = await Migrate.promptToAcceptDryRun();
  }

  if (accept) {
    const config = Config.detect(options);

    config.contracts_build_directory = buildDir;
    config.artifactor = new Artifactor(buildDir);
    config.resolver = new Resolver(config);

    try {
      await Environment.detect(config);
    } catch (error) {
      throw new Error(error);
    }

    config.dryRun = false;
    return {
      preparedConfig: config,
      proceed: true
    };
  } else {
    return { proceed: false };
  }
};
