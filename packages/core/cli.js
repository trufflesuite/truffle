#!/usr/bin/env node
require("source-map-support/register");

const semver = require("semver"); // to validate Node version

const TruffleError = require("@truffle/error");
const TaskError = require("./lib/errors/taskerror");
const analytics = require("./lib/services/analytics");
const version = require("./lib/version");
const versionInfo = version.info();
const XRegExp = require("xregexp");

// pre-flight check: Node version compatibility
const minimumNodeVersion = "8.9.4";
if (!semver.satisfies(process.version, ">=" + minimumNodeVersion)) {
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

const Command = require("./lib/command");

const command = new Command(require("./lib/commands"));

// This should be removed when issue is resolved upstream:
// https://github.com/ethereum/web3.js/issues/1648
const listeners = process.listeners("warning");
listeners.forEach(listener => process.removeListener("warning", listener));

let options = { logger: console };

const inputArguments = process.argv.slice(2);
const userWantsGeneralHelp =
  (inputArguments[0] === "help" || inputArguments[0] === "--help") &&
  inputArguments.length === 1;

if (userWantsGeneralHelp) {
  command.displayGeneralHelp();
  process.exit(0);
}

command
  .run(inputArguments, options)
  .then(() => process.exit(0))
  .catch(error => {
    if (error instanceof TaskError) {
      analytics.send({
        exception: "TaskError - display general help message",
        version: versionInfo.bundle
          ? versionInfo.bundle
          : "(unbundled) " + versionInfo.core
      });
      command.displayGeneralHelp();
    } else {
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
        error = error.stack || error.message || error.toString();
        //remove identifying information if error stack is passed to analytics
        if (error === error.stack) {
          let directory = __dirname;
          //making sure users' identifying information does not get sent to
          //analytics by cutting off everything before truffle. Will not properly catch the user's info
          //here if the user has truffle in their name.
          let identifyingInfo = String.raw`${directory.split("truffle")[0]}`;
          let removedInfo = new XRegExp(XRegExp.escape(identifyingInfo), "g");
          error = error.replace(removedInfo, "");
        }
        analytics.send({
          exception: "Other Error - " + error,
          version: versionInfo.bundle
            ? versionInfo.bundle
            : "(unbundled) " + versionInfo.core
        });
        // Bubble up all other unexpected errors.
        console.log(error.stack || error.message || error.toString());
        version.logTruffleAndNode(options.logger);
      }
    }
    process.exit(1);
  });
