const { Environment } = require("@truffle/environment");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver");
const copy = require("../../copy");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const runMigrations = require("./runMigrations");

module.exports = async function (config) {
  await Environment.fork(config, {
    logging: {
      quiet: true
    },
    // we need to tell Ganache to not unlock any accounts so that only
    // user's accounts are unlocked since this will be a dry run
    wallet: {
      totalAccounts: 0
    }
  });
  // Copy artifacts to a temporary directory
  const temporaryDirectory = tmp.dirSync({
    unsafeCleanup: true,
    prefix: "migrate-dry-run-"
  }).name;

  await copy(config.contracts_build_directory, temporaryDirectory);

  config.contracts_build_directory = temporaryDirectory;
  // Note: Create a new artifactor and resolver with the updated config.
  // This is because the contracts_build_directory changed.
  // Ideally we could architect them to be reactive of the config changes.
  config.artifactor = new Artifactor(temporaryDirectory);
  config.resolver = new Resolver(config);

  return await runMigrations(config);
};
