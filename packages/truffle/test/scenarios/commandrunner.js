var exec = require('child_process').exec;
var path = require("path");

module.exports = {
  run: function(command, config, callback) {
    var execString;

    (process.env.NO_BUILD)
      ? execString = "node " +
                     path.join(__dirname, "../", "../", "../",
                               "truffle-core", "cli.js") +
                     " " + command

      : execString = "node " +
                     path.join(__dirname, "../", "../", "build", "cli.bundled.js") +
                     " " + command;

    var child = exec(execString, {
      cwd: config.working_directory,
    });

    child.stdout.on('data', function(data) {
      data = data.toString().replace(/\n$/, '');
      config.logger.log(data);
    });
    child.stderr.on('data', function(data) {
      data = data.toString().replace(/\n$/, '');
      config.logger.log(data);
    });
    child.on('close', function(code) {
      // If the command didn't exit properly, show the output and throw.
      if (code !== 0) {
        var err = new Error("Unknown exit code: " + code);
        return callback(err);
      }

      callback();
    });

    if (child.error) {
      return callback(child.error);
    }
  }
};
