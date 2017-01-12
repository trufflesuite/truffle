var Config = require("../config");
var Contracts = require("../contracts");
var Migrate = require("truffle-migrate");

var command = {
  command: 'migrate',
  description: 'Run migrations',
  builder: {
    reset: {
      type: "boolean",
      default: false
    },
    "compile-all": {
      describe: "recompile all contracts",
      type: "boolean",
      default: false
    }
  },
  run: function (options, done) {
    var config = Config.detect(options);

    Contracts.compile(config, function(err) {
      if (err) return done(err);
      Migrate.run(config, done);
    });
  }
}

module.exports = command;
