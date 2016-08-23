var TaskError = require("./errors/taskerror");
var yargs = require("yargs");
var _ = require("lodash");

function Command(tasks) {
  this.tasks = tasks;
};

Command.prototype.getTask = function(command) {
  var argv = yargs.parse(command);

  if (argv._.length == 0) {
    return null;
  }

  var task_name = argv._[0];
  var task = this.tasks[task_name];

  return task;
};

Command.prototype.run = function(command, options, callback) {
  if (typeof options == "function") {
    callback = options;
    options = {};
  }

  var task = this.getTask(command);

  if (task == null) {
    if (Array.isArray(command)) {
      command = command.join(" ")
    }

    return callback(new TaskError("Cannot find task for command: " + command));
  }

  var argv = yargs.parse(command);
  // Remove the task name itself.
  if (argv._) {
    argv._.shift();
  }

  // We don't need this.
  delete argv["$0"];

  options = _.extend(_.clone(options), argv);

  try {
    task(options, callback);
  } catch (err) {
    callback(err);
  }
};

module.exports = Command;
