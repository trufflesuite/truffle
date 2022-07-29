const { bundled, core } = require("../lib/version").info();
const OS = require("os");
const analytics = require("../lib/services/analytics");
const { extractFlags } = require("./utils/utils"); // contains utility methods
const globalCommandOptions = require("./global-command-options");
const debugModule = require("debug");
const debug = debugModule("core:command:run");
const commands = require("./commands/commands");
const Web3 = require("web3");

const defaultHost = "127.0.0.1";
const managedGanacheDefaultPort = 9545;
const managedGanacheDefaultNetworkId = 5777;
const managedDashboardDefaultPort = 24012;

// this function takes an object with an array of input strings, an options
// object, and a boolean determining whether we allow inexact matches for
// command names - it returns an object with the command name, the run method,
// and the command's meta object containing help and command description
const getCommand = ({ inputStrings, options, noAliases }) => {
  if (inputStrings.length === 0) {
    return null;
  }

  const firstInputString = inputStrings[0];
  let chosenCommand = null;

  // If the command wasn't specified directly, go through a process
  // for inferring the command.
  if (commands.includes(firstInputString)) {
    chosenCommand = firstInputString;
  } else if (noAliases !== true) {
    let currentLength = 1;
    const availableCommandNames = commands;

    // Loop through each letter of the input until we find a command
    // that uniquely matches.
    while (currentLength <= firstInputString.length) {
      // Gather all possible commands that match with the current length
      const possibleCommands = availableCommandNames.filter(possibleCommand => {
        return (
          possibleCommand.substring(0, currentLength) ===
          firstInputString.substring(0, currentLength)
        );
      });

      // Did we find only one command that matches? If so, use that one.
      if (possibleCommands.length === 1) {
        chosenCommand = possibleCommands[0];
        break;
      }
      currentLength += 1;
    }
  }

  if (chosenCommand === null) {
    return null;
  }

  // determine whether Truffle is being run from the bundle or from ./cli.js
  // and require commands accordingly
  let command;
  if (typeof BUNDLE_VERSION !== "undefined") {
    const path = require("path");
    const filePath = path.join(__dirname, `${chosenCommand}.bundled.js`);
    // we need to use this library to bypass webpack's require which can't
    // access the user's filesystem
    const originalRequire = require("original-require");
    command = originalRequire(filePath);
  } else {
    const filePath = `./commands/${chosenCommand}`;
    command = require(filePath);
  }

  // several commands have a help property that is a function
  if (typeof command.meta.help === "function") {
    command.meta.help = command.meta.help(options);
  }

  return {
    name: chosenCommand,
    run: command.run,
    meta: command.meta
  };
};

// takes an object containing the command (name, run method, and meta object),
// the array of strings that were input, and an options object - it sanitizes
// the input options, merges it with the input options, and returns the result
const prepareOptions = ({ command, inputStrings, options }) => {
  const yargs = require("yargs/yargs")();
  yargs.command(require(`./commands/${command.name}/meta`));
  const commandOptions = yargs.parse(inputStrings);

  // remove the task name itself put there by yargs
  if (commandOptions._) commandOptions._.shift();

  // some options might throw if options is a Config object
  // if so, let's ignore those values
  const clone = {};
  Object.keys(options).forEach(key => {
    try {
      clone[key] = options[key];
    } catch {
      // do nothing with values that throw
    }
  });

  // method `extractFlags(args)` : Extracts the `--option` flags from arguments
  const inputOptions = extractFlags(inputStrings);

  // adding allowed global options as enumerated in each command
  const allowedGlobalOptions = command.meta.help.allowedGlobalOptions
    .filter(tag => tag in globalCommandOptions)
    .map(tag => globalCommandOptions[tag]);

  const allValidOptions = [
    ...command.meta.help.options,
    ...allowedGlobalOptions
  ];

  const validOptions = allValidOptions.reduce((a, item) => {
    // we split the options off from the arguments
    // and then we split to handle options of the form --<something>|-<s>
    let options = item.option.split(" ")[0].split("|");
    return [
      ...a,
      ...options.filter(
        option => option.startsWith("--") || option.startsWith("-")
      )
    ];
  }, []);

  let invalidOptions = inputOptions.filter(opt => !validOptions.includes(opt));

  // TODO: Remove exception for 'truffle run' when plugin options support added.
  if (invalidOptions.length > 0 && command.name !== "run") {
    if (options.logger) {
      const log = options.logger.log || options.logger.debug;
      log(
        "> Warning: possible unsupported (undocumented in help) command line option(s): " +
          invalidOptions
      );
    }
  }

  return {
    ...clone,
    ...commandOptions
  };
};

const runCommand = async function (command, options) {
  try {
    // migrate Truffle data to the new location if necessary
    const configMigration = require("./config-migration");
    await configMigration.migrateTruffleDataIfNecessary();
  } catch (error) {
    debug("Truffle data migration failed: %o", error);
  }

  analytics.send({
    command: command.name ? command.name : "other",
    args: options._,
    version: bundled || "(unbundled) " + core
  });

  const unhandledRejections = new Map();

  process.on("unhandledRejection", (reason, promise) => {
    unhandledRejections.set(promise, reason);
  });

  process.on("rejectionHandled", promise => {
    unhandledRejections.delete(promise);
  });

  process.on("exit", _ => {
    const log = options.logger
      ? options.logger.log || options.logger.debug
      : console.log;
    if (unhandledRejections.size) {
      log("UnhandledRejections detected");
      unhandledRejections.forEach((reason, promise) => {
        log(promise, reason);
      });
    }
  });

  return await command.run(options);
};

const displayGeneralHelp = () => {
  const yargs = require("yargs/yargs")();
  commands.forEach(command => {
    // Exclude "install" and "publish" commands from the generated help list
    // because they have been deprecated/removed.
    if (command !== "install" && command !== "publish") {
      yargs.command(require(`./commands/${command}/meta`));
    }
  });
  yargs
    .usage(
      "Truffle v" +
        (bundled || core) +
        " - a development framework for Ethereum" +
        OS.EOL +
        OS.EOL +
        "Usage: truffle <command> [options]"
    )
    .epilog("See more at http://trufflesuite.com/docs")
    .showHelp();
};

const getConfiguredNetworkUrl = function (customConfig, isDashboardNetwork) {
  const defaultPort = isDashboardNetwork
    ? managedDashboardDefaultPort
    : managedGanacheDefaultPort;
  const configuredNetworkOptions = {
    host: customConfig.host || defaultHost,
    port: customConfig.port || defaultPort
  };
  const urlSuffix = isDashboardNetwork ? "/rpc" : "";
  return `http://${configuredNetworkOptions.host}:${configuredNetworkOptions.port}${urlSuffix}`;
};

const deriveConfigEnvironment = function (detectedConfig, network, url) {
  let configuredNetwork;

  const configDefinesProvider =
    detectedConfig.networks[network] &&
    detectedConfig.networks[network].provider;

  if (configDefinesProvider) {
    // Use "provider" specified in the config to connect to the network
    // along with the other specified network properties
    configuredNetwork = {
      ...detectedConfig.networks[network],
      network_id: "*",
      provider: detectedConfig.networks[network].provider
    };
  } else if (url) {
    // Use "url" to configure network (implies not "develop" and not "dashboard")
    configuredNetwork = {
      network_id: "*",
      url,
      provider: function () {
        return new Web3.providers.HttpProvider(url, {
          keepAlive: false
        });
      }
    };
  } else {
    // Otherwise derive network settings
    const customConfig = detectedConfig.networks[network] || {};
    const isDashboardNetwork = network === "dashboard";
    const configuredNetworkUrl = getConfiguredNetworkUrl(
      customConfig,
      isDashboardNetwork
    );
    const defaultPort = isDashboardNetwork
      ? managedDashboardDefaultPort
      : managedGanacheDefaultPort;
    const defaultNetworkId = isDashboardNetwork
      ? "*"
      : managedGanacheDefaultNetworkId;

    configuredNetwork = {
      // customConfig will spread only when it is defined and ignored when undefined
      ...customConfig,
      host: customConfig.host || defaultHost,
      port: customConfig.port || defaultPort,
      network_id: customConfig.network_id || defaultNetworkId,
      provider: function () {
        return new Web3.providers.HttpProvider(configuredNetworkUrl, {
          keepAlive: false
        });
      }
    };
  }

  detectedConfig.networks[network] = {
    ...configuredNetwork
  };

  return detectedConfig;
};

module.exports = {
  displayGeneralHelp,
  getCommand,
  prepareOptions,
  runCommand,
  getConfiguredNetworkUrl,
  deriveConfigEnvironment
};
