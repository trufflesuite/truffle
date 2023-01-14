const { exec } = require("child_process");
const { EOL } = require("os");
const path = require("path");

/**
 * Log an annotated message to stdout. This is useful to tap into a chile process'
 * stdout and stderr for debug purposes. When run in our CI it will be recorded
 * to the run's log, and will display on the console when executed locally.
 *
 * @param {string} message - the message to log
 * @param {boolean} isError - true if error
 */
const Log = (message, isError) => {
  const prefix = `* ${isError ? "E" : " "} * |\t`;
  const annotatedMessage = message
    .split("\n")
    .map(l => `${prefix}${l}`)
    .join("\n");
  console.log(annotatedMessage);
};

module.exports = {
  getExecString: function () {
    return process.env.NO_BUILD
      ? `node ${path.join(__dirname, "../", "../", "../", "core", "cli.js")}`
      : `node ${path.join(__dirname, "../", "../", "build", "cli.bundled.js")}`;
  },

  /**
   * Run a truffle command as a child process and examine its output, via supplied
   * `config.logger.log`
   *
   * @param {string} command - the truffle command to run.
   * @param {TruffleConfig} config - Truffle config to be used for the test.
   * @param {string} debugEnv - comma separate string to pass as DEBUG env to child process. This
   *        string informs the node debug module which trace statements to execute. When set the
   *        child process' stdout and stderr are logged and will be captured in the CI log when
   *        run in CI, or in the terminal if executed locally.
   *
   *        For example: "*,-develop*,-co*,-reselect*" will match all values, excluding those that
   *        start with develop, co or reselect. See https://github.com/debug-js/debug#conventions
   *
   * @returns a Promise that resolves if the child process is successful, rejects otherwise.
   */
  run: function (command, config, debugEnv = "") {
    const execString = `${this.getExecString()} ${command}`;
    const shouldLog = debugEnv.trim().length > 0;
    const childEnv = shouldLog
      ? { ...process.env, DEBUG: debugEnv }
      : process.env;

    shouldLog && Log("CommandRunner");
    shouldLog && Log(`execString: ${execString}`);

    return new Promise((resolve, reject) => {
      let child = exec(execString, {
        cwd: config.working_directory,
        env: childEnv
      });

      child.stdout.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        shouldLog && Log(data);
        config.logger.log(data);
      });

      child.stderr.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        shouldLog && Log(data, true);
        config.logger.log(data);
      });

      child.on("close", code => {
        // If the command didn't exit properly, show the output and throw.
        if (code !== 0) {
          shouldLog && Log(`errorCode: ${code}`, true);
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
    executableArgs = "",
    displayHost
  } = {}) {
    const cmdLine = `${this.getExecString()} ${executableCommand} ${executableArgs}`;

    const readyPrompt =
      executableCommand === "debug"
        ? `debug(${displayHost})>`
        : `truffle(${displayHost})>`;

    // seems safe to escape parens only, as the readyprompt is constructed from
    // [a-zA-Z] strings and wrapping parens.
    const escapedPrompt = readyPrompt.replace("(", "\\(").replace(")", "\\)");
    const readyPromptRex = new RegExp(`^${escapedPrompt}`, "m");

    let outputBuffer = "";

    return new Promise((resolve, reject) => {
      const child = exec(cmdLine, { cwd: config.working_directory });

      if (child.error) return reject(child.error);

      child.stderr.on("data", data => {
        config.logger.log("ERR: ", data);
      });

      child.stdout.on("data", data => {
        // accumulate buffer from chunks
        outputBuffer += data;

        if (readyPromptRex.test(outputBuffer)) {
          // Set outputBuffer to remaining segment after final match.
          // This will match the next prompt. There can only ever be one
          // readyPrompt as the prompt is presented only after the REPL
          // *evaluates* a command.
          const segments = outputBuffer.split(readyPromptRex);
          outputBuffer = segments.pop();

          if (inputCommands.length === 0) {
            // commands exhausted, close stdin
            child.stdin.end();
          } else {
            // fifo pop next command and let the REPL evaluate the next
            // command.
            const nextCmd = inputCommands.shift();
            child.stdin.write(nextCmd + EOL);
          }
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
