const command = {
  command: "create",
  description: "Helper to create new contracts, migrations and tests",
  builder: {
    all: {
      type: "boolean",
      default: false
    },
    force: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle create <artifact_type> <ArtifactName>",
    options: [
      {
        option: "<artifact_type>",
        description:
          "Create a new artifact where artifact_type is one of the following: " +
          "contract, migration,\n                    test or all. The new artifact is created " +
          "along with one (or all) of the following\n                    files: `contracts/ArtifactName.sol`, " +
          "`migrations/####_artifact_name.js` or\n                    `tests/artifact_name.js`. (required)"
      },
      {
        option: "<ArtifactName>",
        description: "Name of new artifact. (required)"
      }
    ]
  },
  run: function (options, done) {
    const Config = require("@truffle/config");
    const ConfigurationError = require("../../errors/configurationerror");
    const create = require("./helpers");

    const config = Config.detect(options);

    let type = config.type;

    if (type == null && config._.length > 0) {
      type = config._[0];
    }

    let name = config.name;

    if (name == null && config._.length > 1) {
      name = config._[1];
    }

    if (type == null) {
      return done(
        new ConfigurationError(
          "Please specify the type of item to create. Example: truffle create contract MyContract"
        )
      );
    }

    if (name == null) {
      return done(
        new ConfigurationError(
          "Please specify the name of item to create. Example: truffle create contract MyContract"
        )
      );
    }

    if (!/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name)) {
      return done(
        new ConfigurationError(
          "The name " +
            name +
            " is invalid. Please enter a valid name using alpha-numeric characters."
        )
      );
    }

    const fn = create[type];

    const destinations = {
      contract: config.contracts_directory,
      migration: config.migrations_directory,
      test: config.test_directory
    };

    if (type === "all")
      Object.keys(destinations).forEach((type, _) =>
        create[type](destinations[type], name, options, done)
      );
    else if (fn == null)
      return done(new ConfigurationError("Cannot find creation type: " + type));
    else create[type](destinations[type], name, options, done);
  }
};

module.exports = command;
