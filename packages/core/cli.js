#!/usr/bin/env node
require("source-map-support/register");

const semver = require("semver"); // to validate Node version
const TruffleError = require("@truffle/error");
const TaskError = require("./lib/errors/taskerror");
const XRegExp = require("xregexp");
const { sendAnalytics } = require("./lib/utils/utils");

// we need to make sure this function exists so ensjs doesn't complain as it requires
// getRandomValues for some functionalities - webpack strips out the crypto lib
// so we shim it here
global.crypto = {
  getRandomValues: require("get-random-values")
};

// pre-flight check: Node version compatibility
const minimumNodeVersion = "12.0.0";
if (!semver.gte(process.version, minimumNodeVersion)) {
  console.log(
    "Error: Node version not supported. You are currently using version " +
      process.version.slice(1) +
      " of Node. Truffle requires Node v" +
      minimumNodeVersion +
      " or higher."
  );

  sendAnalytics({ exception: "wrong node version" });
  process.exit(1);
}

const Command = require("./lib/command");
const command = new Command(require("./lib/commands"));

// This should be removed when issue is resolved upstream:
// https://github.com/ethereum/web3.js/issues/1648
const listeners = process.listeners("warning");
listeners.forEach(listener => process.removeListener("warning", listener));

let options = { logger: console };

const inputArguments = process.argv.slice(2);
const userWantsGeneralHelp =
  inputArguments.length === 1 && ["help", "--help"].includes(inputArguments[0]);

if (userWantsGeneralHelp) {
  command.displayGeneralHelp();
  process.exit(0);
}

command
  .run(inputArguments, options)
  .then(returnStatus => process.exit(returnStatus))
  .catch(error => {
    const version = require("./lib/version");
    if (error instanceof TaskError) {
      sendAnalytics({ exception: "TaskError - display general help message" });
      command.displayGeneralHelp();
    } else if (error instanceof TruffleError) {
      sendAnalytics({ exception: "TruffleError - missing configuration file" });
      console.log(error.message);
      version.logTruffleAndNode(options.logger);
    } else if (typeof error === "number") {
      sendAnalytics({ exception: "Numbered Error - " + error });
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
      sendAnalytics({ exception: "Other Error - " + errorData });
      // Bubble up all other unexpected errors.
      console.log(error.stack || error.message || error.toString());
      version.logTruffleAndNode(options.logger);
    }
    process.exit(1);
  });
