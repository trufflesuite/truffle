const { exec } = require("child_process");
const { EOL } = require("os");
const path = require("path");
const util = require("util");

//prepare a helpful message to standout in CI log noise
const Log = (msg, isErr) => {
  const fmt = msg
    .split("\n")
    .map(
      l =>
        `\t---truffle commandRunner ${isErr ? "stderr" : "stdout"}--- |\t${l}`
    )
    .join("\n");
  console.log(fmt);
};

module.exports = {
  getExecString: function () {
    return process.env.NO_BUILD
      ? `node ${path.join(__dirname, "../", "../", "../", "core", "cli.js")}`
      : `node ${path.join(__dirname, "../", "../", "build", "cli.bundled.js")}`;
  },
  run: function (command, config) {
    const execString = `${this.getExecString()} ${command}`;

    Log("CommandRunner");
    Log(util.inspect(config.networks, { depth: Infinity }));
    Log(util.inspect(config.network, { depth: Infinity }));
    Log(util.inspect(config.truffle_directory, { depth: Infinity }));
    Log(util.inspect(config.working_directory, { depth: Infinity }));
    Log(`execString: ${execString}`);

    return new Promise((resolve, reject) => {
      let child = exec(execString, {
        cwd: config.working_directory,
        env: {
          ...process.env,
          DEBUG:
            "*,-develop*,-co*,-reselect*,-pro*,-dec*,-resolv*,-deb*,provider,-source*"
        }
      });

      child.stdout.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        Log(data);
        config.logger.log(data);
      });
      child.stderr.on("data", data => {
        data = data.toString().replace(/\n$/, "");
        Log(data, true);
        config.logger.log(data);
      });
      child.on("close", code => {
        // If the command didn't exit properly, show the output and throw.
        if (code !== 0) {
          Log(`errorCode: ${code}`, true);
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
    const cmdLine = `${this.getExecString()} develop`;
    const readyPrompt = "truffle(develop)>";

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
