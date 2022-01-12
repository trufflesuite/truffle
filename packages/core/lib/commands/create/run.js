module.exports = async function (options) {
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
    throw new ConfigurationError(
      "Please specify the type of item to create. Example: truffle create contract MyContract"
    );
  }

  if (name == null) {
    throw new ConfigurationError(
      "Please specify the name of item to create. Example: truffle create contract MyContract"
    );
  }

  if (!/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name)) {
    throw new ConfigurationError(
      `The name ${name} is invalid. Please enter a valid name using alpha-numeric characters.`
    );
  }

  const fn = create[type];

  const destinations = {
    contract: config.contracts_directory,
    migration: config.migrations_directory,
    test: config.test_directory
  };

  if (type === "all") {
    for (const key of Object.keys(destinations)) {
      await create[key](destinations[key], name, options);
    }
    return;
  } else if (fn == null) {
    throw new ConfigurationError(`Cannot find creation type: ${type}`);
  } else {
    return await create[type](destinations[type], name, options);
  }
};
