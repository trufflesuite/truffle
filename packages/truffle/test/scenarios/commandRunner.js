const { exec } = require("child_process");
const { EOL } = require("os");
const path = require("path");

module.exports = {
  getExecString: function () {
    return process.env.NO_BUILD
      ? `node ${path.join(__dirname, "../", "../", "../", "core", "cli.js")}`
      : `node ${path.join(__dirname, "../", "../", "build", "cli.bundled.js")}`;
  },
  run: function (command, config) {
    const execString = `${this.getExecString()} ${command}`;

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
  runInDevelopEnvironment: function (commands = [], config) {
    // get command for opening `truffle develop`
    const cmdLine = `${this.getExecString()} develop`;

    return new Promise((resolve, reject) => {
      const child = exec(cmdLine, { cwd: config.working_directory });

      if (child.error) return reject(child.error);

      child.stderr.on("data", data => {
        config.logger.log("ERR: ", data);
      });

      child.stdout.on("data", data => {
        config.logger.log("OUT: ", data);
      });

      child.on("close", code => {
        config.logger.log("EXIT: ", code);
        resolve();
      });

      commands.forEach(command => {
        child.stdin.write(command + EOL);
      });
      child.stdin.end();
    });
  }
};
