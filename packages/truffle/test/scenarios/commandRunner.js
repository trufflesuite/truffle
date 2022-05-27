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
  runInREPL: function ({
    commands = [], // array of commands to enter when the prompt is ready to take input
    config, // truffle config to be used for the test
    replCommand, // truffle command to be tested (develop/console)
    replArgs, // arguments to be sent with the replCommand
    displayHost // name of the network host to be displayed in the prompt
  } = {}) {
    const cmdLine = `${this.getExecString()} ${replCommand} ${replArgs}`;
    const readyPrompt = `truffle(${displayHost})>`;

    let seenChildPrompt = false;
    let outputBuffer = "";

    return new Promise((resolve, reject) => {
      const child = exec(cmdLine, { cwd: config.working_directory });

      if (child.error) return reject(child.error);

      child.stderr.on("data", data => {
        config.logger.log("ERR: ", data);
      });

      child.stdout.on("data", data => {
        // accumulate buffer from chunks
        if (!seenChildPrompt) {
          outputBuffer += data;
        }

        // child process is ready for input when it displays the readyPrompt
        if (!seenChildPrompt && outputBuffer.includes(readyPrompt)) {
          seenChildPrompt = true;
          commands.forEach(command => {
            child.stdin.write(command + EOL);
          });
          child.stdin.end();
        }

        config.logger.log("OUT: ", data);
      });

      child.on("close", code => {
        config.logger.log("EXIT: ", code);
        resolve();
      });
    });
  }
};
