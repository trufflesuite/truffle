var command = {
  command: 'create',
  description: 'Helper to create new contracts, migrations and tests',
  builder: {
    all: {
      type: "boolean",
      default: false
    }
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var ConfigurationError = require("../errors/configurationerror");
    var create = require("../create");

    var config = Config.detect(options);

    var type = config.type;

    if (type == null && config._.length > 0) {
      type = config._[0]
    }

    var name = config.name;

    if (name == null && config._.length > 1) {
      name = config._[1];
    }

    if (type == null) {
      return done(new ConfigurationError("Please specify the type of item to create. Example: truffle create contract MyContract"));
    }

    if (name == null) {
      return done(new ConfigurationError("Please specify the type of item to create. Example: truffle create contract MyContract"));
    }

    var fn = create[type];

    if (fn == null) return done(new ConfigurationError("Cannot find creation type: " + type));

    var destinations = {
      "contract": config.contracts_directory,
      "migration": config.migrations_directory,
      "test": config.test_directory
    };

    create[type](destinations[type], name, done);
  }
}

module.exports = command;
