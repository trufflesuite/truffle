module.exports = {
  run: require("./run"),
  meta: require("./meta"),
  runMigrations: require("./runMigrations"),
  setUpDryRunEnvironmentThenRunMigrations: require("./setUpDryRunEnvironmentThenRunMigrations"),
  determineDryRunSettings: require("./determineDryRunSettings"),
  prepareConfigForRealMigrations: require("./prepareConfigForRealMigrations")
};
