const migrationsV5 = require("./reporters/migrations-V5/reporter");

module.exports = {
  migrationsV5: migrationsV5,
  ReporterAggregator: require("./ReporterAggregator")
};
