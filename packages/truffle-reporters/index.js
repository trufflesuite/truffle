const migrationsV5 = require("./reporters/migrations-V5/reporter");

module.exports = {
  CompileReporter: require("./compile"),
  migrationsV5: migrationsV5,
  Reporter: require("./Reporter")
};
