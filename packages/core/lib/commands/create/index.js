const command = {
  command: "create",
  description: "Helper to create new contracts, migrations and tests",
  builder: {},
  help: {
    usage: "truffle create [SmartContractType] <ArtifactType> <ArtifactName>",
    options: [
      {
        option: "<SmartContractType>",
        description: "Type of smart contract to generate. (optional)"
      },
      {
        option: "<ArtifactType>",
        description:
          "Create a new artifact where ArtifactType is one of the following: " +
          "contract, migration\n                    or test. The new artifact is created " +
          "along with one of the following files:\n                    `contracts/ArtifactName.sol`, " +
          "`migrations/####_artifact_name.js` or\n                    `tests/artifact_name.js`. (required)"
      },
      {
        option: "<ArtifactName>",
        description: "Name of new artifact. (required)"
      }
    ]
  },
  run: function(options, done) {
    const Config = require("@truffle/config");
    const ConfigurationError = require("../../errors/configurationerror");
    const create = require("./helpers");

    const config = Config.detect(options);
    const { _: userArgs } = config;

    if (userArgs[0] === undefined) {
      return done(
        new ConfigurationError(
          "Please specify the type of item to create. Example: truffle create reasonligo contract MyContract"
        )
      );
    }

    const smartContractType =
      userArgs[0] === "pascaligo" ||
      userArgs[0] === "cameligo" ||
      userArgs[0] === "reasonligo" ||
      userArgs[0] === "smartpy"
        ? userArgs[0]
        : undefined;
    const artifactType = smartContractType ? userArgs[1] : userArgs[0];

    if (artifactType === undefined) {
      return done(
        new ConfigurationError(
          "Please specify the type of contract to create. Example: truffle create pascaligo contract MyContract"
        )
      );
    }

    const artifactName = smartContractType ? userArgs[2] : userArgs[1];

    if (artifactName === undefined) {
      return done(
        new ConfigurationError(
          "Please specify the name of item to create. Example: truffle create test myContractTest"
        )
      );
    }

    if (!/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(artifactName)) {
      return done(
        new ConfigurationError(
          "The name " +
            artifactName +
            " is invalid. Please enter a valid name using alpha-numeric characters."
        )
      );
    }

    if (create[artifactType] === undefined)
      return done(
        new ConfigurationError("Cannot create item type: " + artifactType)
      );

    const destinations = {
      contract: config.contracts_directory,
      migration: config.migrations_directory,
      test: config.test_directory
    };

    create[artifactType](
      destinations[artifactType],
      smartContractType,
      artifactName,
      options,
      done
    );
  }
};

module.exports = command;
