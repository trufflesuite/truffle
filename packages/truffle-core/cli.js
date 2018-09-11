#!/usr/bin/env node
require('source-map-support/register')

var Config = require("truffle-config");
var Command = require("./lib/command");
var TaskError = require("./lib/errors/taskerror");
var TruffleError = require("truffle-error");

var command = new Command(require("./lib/commands"));

// Hack to suppress web3 MaxListenersExceededWarning
// This should be removed when issue is resolved upstream:
// https://github.com/ethereum/web3.js/issues/1648
var listeners = process.listeners('warning');
listeners.forEach(listener => process.removeListener('warning', listener));

var options = {
  logger: console
};

const inputArguments = process.argv.slice(2);
const userWantsGeneralHelp = inputArguments[0] === 'help' &&  inputArguments.length === 1;

if (userWantsGeneralHelp) {
  command.displayGeneralHelp();
  process.exit(0);
}

command.run(inputArguments, options, function(err) {
  if (err) {
    if (err instanceof TaskError) {
      command.displayGeneralHelp();
    } else {
      if (err instanceof TruffleError) {
        console.log(err.message);
      } else if (typeof err == "number") {
        // If a number is returned, exit with that number.
        process.exit(err);
      } else {
        // Bubble up all other unexpected errors.
        console.log(err.stack || err.toString());
      }
    }
    process.exit(1);
  }
  process.exit(0);
});
