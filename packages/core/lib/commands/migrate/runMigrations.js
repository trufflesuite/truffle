const Migrate = require("@truffle/migrate");

module.exports = async function (config) {
  if (config.f) {
    return await Migrate.runFrom(config.f, config);
  } else {
    const needsMigrating = await Migrate.needsMigrating(config);

    if (needsMigrating) {
      return await Migrate.run(config);
    } else {
      config.logger.log("Network up to date.");
    }
  }
};
