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
  /**
   * This is a function to test the output of a truffle develop/console command with arguments.
   * @param {string[]} inputCommands - An array of input commands to enter when the prompt is ready.
   * @param {TruffleConfig} config - Truffle config to be used for the test.
   * @param {string} executableCommand - Truffle command to be tested (develop/console).
   * @param {string} executableArgs - Space separated arguments/options to be used with the executableCommand.
   * @param {string} displayHost - Name of the network host to be displayed in the prompt.
   * @returns a Promise
   */
  runInREPL: function ({
    inputCommands = [],
    config,
    executableCommand,
    executableArgs,
    displayHost
  } = {}) {
    const cmdLine = `${this.getExecString()} ${executableCommand} ${executableArgs}`;
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
          inputCommands.forEach(command => {
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
