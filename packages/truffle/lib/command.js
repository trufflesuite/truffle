var TaskError = require("./errors/taskerror");
var yargs = require("yargs");
var _ = require("lodash");
var yargs = require("yargs");

function Command(commands) {
  this.commands = commands;

  var args = yargs.reset();

  Object.keys(this.commands).forEach(function(command) {
    args = args.command(commands[command]);
  });

  this.args = args;
};

Command.prototype.getCommand = function(str) {
  var argv = this.args.parse(str);

  if (argv._.length == 0) {
    return null;
  }

  var name = argv._[0];
  var command = this.commands[name];

  if (command == null) {
    return null;
  }

  return {
    name: name,
    argv: argv,
    command: command
  };
};

Command.prototype.run = function(command, options, callback) {
  if (typeof options == "function") {
    callback = options;
    options = {};
  }

  var result = this.getCommand(command);

  if (result == null) {
    return callback(new TaskError("Cannot find command: " + command));
  }

  var argv = result.argv;

  // Remove the task name itself.
  if (argv._) {
    argv._.shift();
  }

  // We don't need this.
  delete argv["$0"];

  // Some options might throw if options is a Config object. If so, let's ignore those options.
  var clone = {};
  Object.keys(options).forEach(function(key) {
    try {
      clone[key] = options[key];
    } catch (e) {
      // Do nothing with values that throw.
    }
  });

  options = _.extend(clone, argv);

  try {
    result.command.run(options, callback);
  } catch (err) {
    callback(err);
  }
};

module.exports = Command;
