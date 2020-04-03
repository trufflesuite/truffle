const exec = require("child_process").exec;
const path = require("path");

module.exports = {
  run: function(command, config) {
    let execString;

    process.env.NO_BUILD
      ? (execString =
          "node " +
          path.join(__dirname, "../", "../", "../", "core", "cli.js") +
          " " +
          command)
      : (execString =
          "node " +
          path.join(__dirname, "../", "../", "build", "cli.bundled.js") +
          " " +
          command);

    let child = exec(execString, {
      cwd: config.working_directory
    });

    return new Promise((resolve, reject) => {
      child.stdout.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        config.logger.log(data);
      });
      child.stderr.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        config.logger.log(data);
      });
      child.on("close", code => {
        // If the command didn't exit properly, show the output and throw.
        if (code !== 0) {
          const err = new Error("Unknown exit code: " + code);
          reject(err);
        }

        resolve();
      });

      if (child.error) {
        throw child.error;
      }
    });
  }
};
