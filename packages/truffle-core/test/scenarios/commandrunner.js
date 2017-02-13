var Commander = require("../../lib/command");
var commands = require("../../lib/commands");
var commander = new Commander(commands);

module.exports = {
  run: function(command, config, callback) {
    commander.run(command, config, function(err) {
      if (err != 0) {
        if (typeof err == "number") {
          err = new Error("Unknown exit code: " + err);
        }
        return callback(err);
      }

      callback();
    });
  }
};
