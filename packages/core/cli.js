#!/usr/bin/env node
require("source-map-support/register");

const semver = require("semver"); // to validate Node version
const TruffleError = require("@truffle/error");
const analytics = require("./lib/services/analytics");
const version = require("./lib/version");
const versionInfo = version.info();
const XRegExp = require("xregexp");

// we need to make sure this function exists so ensjs doesn't complain as it requires
// getRandomValues for some functionalities - webpack strips out the crypto lib
// so we shim it here
global.crypto = {
  getRandomValues: require("get-random-values")
};

// pre-flight check: Node version compatibility
const minimumNodeVersion = "14.0.0";
if (!semver.gte(process.version, minimumNodeVersion)) {
  console.log(
    "Error: Node version not supported. You are currently using version " +
      process.version.slice(1) +
      " of Node. Truffle requires Node v" +
      minimumNodeVersion +
      " or higher."
  );

  analytics.send({
    exception: "wrong node version",
    version: versionInfo.bundle || "(unbundled) " + versionInfo.core
  });

  process.exit(1);
}

// This should be removed when issue is resolved upstream:
// https://github.com/ethereum/web3.js/issues/1648
const listeners = process.listeners("warning");
listeners.forEach(listener => process.removeListener("warning", listener));

const { handleHelpInput } = require("./lib/cliHelp");
const {
  getCommand,
  prepareOptions,
  runCommand,
  displayGeneralHelp
} = require("./lib/command-utils");

const inputArguments = process.argv.slice(2);
// handle cases where input indicates the user wants to access Truffle's help
const { displayHelp, inputStrings } = handleHelpInput({ inputArguments });
if (displayHelp) {
  displayGeneralHelp();
  process.exit();
}

const command = getCommand({
  inputStrings,
  options: {},
  noAliases: false
});

//getCommand() will return null if a command not recognized by truffle is used.
if (command === null) {
  console.log(
    `\`truffle ${inputStrings.join(
      " "
    )}\` is not a valid truffle command. Please see \`truffle help\` for available commands.`
  );
  process.exit(1);
}

const options = prepareOptions({
  command,
  inputStrings,
  options: {}
});

runCommand(command, options)
  .then(returnStatus => {
    process.exitCode = returnStatus;
    return require("@truffle/promise-tracker").waitForOutstandingPromises();
  })
  .then(() => {
    process.exit();
  })
  .catch(error => {
    if (error instanceof TruffleError) {
      analytics.send({
        exception: "TruffleError - missing configuration file",
        version: versionInfo.bundle
          ? versionInfo.bundle
          : "(unbundled) " + versionInfo.core
      });
      console.log(error.message);
      version.logTruffleAndNode(options.logger);
    } else if (typeof error === "number") {
      analytics.send({
        exception: "Numbered Error - " + error,
        version: versionInfo.bundle
          ? versionInfo.bundle
          : "(unbundled) " + versionInfo.core
      });
      // If a number is returned, exit with that number.
      process.exit(error);
    } else {
      let errorData = error.stack || error.message || error.toString();
      //remove identifying information if error stack is passed to analytics
      if (errorData === error.stack) {
        const directory = __dirname;
        //making sure users' identifying information does not get sent to
        //analytics by cutting off everything before truffle. Will not properly catch the user's info
        //here if the user has truffle in their name.
        let identifyingInfo = String.raw`${directory.split("truffle")[0]}`;
        let removedInfo = new XRegExp(XRegExp.escape(identifyingInfo), "g");
        errorData = errorData.replace(removedInfo, "");
      }
      analytics.send({
        exception: "Other Error - " + errorData,
        version: versionInfo.bundle
          ? versionInfo.bundle
          : "(unbundled) " + versionInfo.core
      });
      // Bubble up all other unexpected errors.
      console.log(error.stack || error.message || error.toString());
      version.logTruffleAndNode(options.logger);
    }
    process.exit(1);
  });
