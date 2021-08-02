const { exec } = require("child_process");
const { EOL } = require ("os");
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

    return new Promise((resolve, reject) => {
      let child = exec(execString, {
        cwd: config.working_directory
      });

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
          reject(new Error("Unknown exit code: " + code));
        }
        resolve();
      });

      if (child.error) {
        reject(child.error);
      }
    });
  },
  runInDevelopEnvironment: (commands = [], config) => {
    let child;
    // open `truffle develop`
    const cmdLine = "node " +
      path.join(__dirname, "../../../", "core", "cli.js") +
      " develop";

    return new Promise((resolve, reject) => {
      child = exec(cmdLine, { cwd: config.working_directory });

      if (child.error) return reject(child.error);

      child.stderr.on("data", (data) => {
        config.logger.log("ERR: ", data);
      });

      child.stdout.on("data", (data) => {
        config.logger.log("OUT: ", data);
      });

      child.on("close", (code) => {
        config.logger.log("EXIT: ", code);
        resolve();
      });

      commands.forEach(command => {
        child.stdin.write(command + EOL);
      });
      child.stdin.end();
    });
  },
};
