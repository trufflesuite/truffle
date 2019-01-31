const migrationsV5 = require("./reporters/migrations-V5/reporter");

module.exports = {
  CompilationReporter: require("./compilation"),
  migrationsV5: migrationsV5,
  Reporter: require("./Reporter")
};
