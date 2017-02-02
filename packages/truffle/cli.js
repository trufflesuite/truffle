#!/usr/bin/env node
var Config = require("truffle-config");
var Command = require("./lib/command");
var TaskError = require("./lib/errors/taskerror");
var TruffleError = require("truffle-error");
var Resolver = require("truffle-resolver");
var pkg = require("./package.json");
var OS = require("os");

var command = new Command(require("./lib/commands"));

var options = {
  logger: console
};

command.run(process.argv.slice(2), options, function(err) {
  if (err) {
    if (err instanceof TaskError) {
      command.args
        .usage("Truffle v" + pkg.version + " - a development framework for Ethereum"
        + OS.EOL + OS.EOL
        + 'Usage: truffle <command> [options]')
        .epilog("See more at http://truffleframework.com/docs")
        .showHelp();
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
});
