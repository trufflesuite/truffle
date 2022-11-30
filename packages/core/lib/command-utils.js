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
  if (firstInputString === "-v" || firstInputString === "--version") {
    chosenCommand = "version";
  } else if (commands.includes(firstInputString)) {
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
  yargs
    .command(require(`./commands/${command.name}/meta`))
    //Turn off yargs' default behavior when handling `truffle --version` & `truffle <cmd> --help`
    .version(false)
    .help(false);

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

  // method `extractFlags(args)` : Extracts the `--option` & `-option` flags from arguments
  let inputOptions = extractFlags(inputStrings);

  //prevent invalid option warning for `truffle -v` & `truffle --version`
  if (command.name === "version") {
    inputOptions = inputOptions.filter(
      opt => opt !== "-v" && opt !== "--version"
    );
  }
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

const processHelpInput = inputStrings => {
  //is it wrong syntax of help?
  if (inputStrings.length > 2 && ["help", "--help"].includes(inputStrings[1])) {
    const help = require("./commands/help").meta;
    console.log(
      "Error: please use below syntax to displaying help information\n",
      "\n               ",
      help.help.usage
    );
    process.exit();
  }

  // when `truffle --help <cmd>` is used, convert inputStrings to run as `truffle help <cmd>`
  if (inputStrings.length > 1 && inputStrings[0] === "--help") {
    inputStrings[inputStrings.indexOf("--help")] = "help";
  }

  // when `truffle <cmd> help | --help` is used, convert inputStrings  to run as `truffle help <cmd>`
  if (["help", "--help"].includes(inputStrings[inputStrings.length - 1])) {
    inputStrings.pop();
    inputStrings.unshift("help");
  }

  const userWantsGeneralHelp =
    inputStrings.length === 0 ||
    (inputStrings.length === 1 && ["help", "--help"].includes(inputStrings[0]));

  //is it general help?
  if (userWantsGeneralHelp) {
    displayGeneralHelp();
    process.exit(0);
  }
  return inputStrings;
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

/**
 * This is a function to configure the url from the user specified network settings in the config.
 * @param {TruffleConfig} customConfig - Default config with user specified settings.
 * @param {boolean} isDashboardNetwork - Check if the network is dashboard or not.
 * @returns a string with the configured url
 */
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

/**
 * This is a function to derive the config environment from the user specified settings.
 * @param {TruffleConfig} detectedConfig - Default config with user specified settings.
 * @param {string} network - Network name specified with the `--network` option.
 * @param {string} url - URL specified with the `--url` option.
 * @returns a TruffleConfig object with the user specified settings in the config
 */
const deriveConfigEnvironment = function (detectedConfig, network, url) {
  let configuredNetwork;

  const configDefinesProvider =
    detectedConfig.networks[network] &&
    detectedConfig.networks[network].provider;

  if (configDefinesProvider) {
    // Use "provider" specified in the config to connect to the network
    // along with the other network properties
    configuredNetwork = {
      network_id: "*",
      ...detectedConfig.networks[network]
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
    const defaultNetworkId = isDashboardNetwork
      ? "*"
      : managedGanacheDefaultNetworkId;

    configuredNetwork = {
      network_id: customConfig.network_id || defaultNetworkId,
      provider: function () {
        return new Web3.providers.HttpProvider(configuredNetworkUrl, {
          keepAlive: false
        });
      },
      // customConfig will spread only when it is defined and ignored when undefined
      ...customConfig
    };
  }

  detectedConfig.networks[network] = {
    ...configuredNetwork
  };

  return detectedConfig;
};

module.exports = {
  processHelpInput,
  displayGeneralHelp,
  getCommand,
  prepareOptions,
  runCommand,
  getConfiguredNetworkUrl,
  deriveConfigEnvironment
};
