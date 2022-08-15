const { IPC } = require("node-ipc");
const path = require("path");
const { spawn } = require("child_process");
const debug = require("debug");
const chalk = require("chalk");

const Develop = {
  start: async function (ipcNetwork, ganacheOptions = {}) {
    let chainPath;

    // The path to the dev env process depends on whether or not
    // we're running in the bundled version. If not, use chain.js
    // directly, otherwise let the bundle point at the bundled version.
    if (typeof BUNDLE_CHAIN_FILENAME !== "undefined") {
      // Remember: In the bundled version, __dirname refers to the
      // build directory where cli.bundled.js and cli.chain.js live.
      chainPath = path.join(__dirname, BUNDLE_CHAIN_FILENAME);
    } else {
      chainPath = path.join(__dirname, "./", "chain.js");
    }

    const logger = ganacheOptions.logger || console;
    //check that genesis-time config option passed through the
    //truffle-config.js file is a valid time.
    if (ganacheOptions.time && isNaN(Date.parse(ganacheOptions.time))) {
      ganacheOptions.time = Date.now();
      logger.log(
        "\x1b[31m%s\x1b[0m",
        "Invalid Date passed to genesis-time, using current Date instead",
        "\x1b[0m"
      );
    }

    const stringifiedOptions = JSON.stringify(ganacheOptions);
    const optionsBuffer = Buffer.from(stringifiedOptions);
    const base64OptionsString = optionsBuffer.toString("base64");

    return spawn("node", [chainPath, ipcNetwork, base64OptionsString], {
      detached: true,
      stdio: "ignore"
    });
  },

  connect: function (ipcOptions, truffleConfig) {
    const debugServer = debug("develop:ipc:server");
    const debugClient = debug("develop:ipc:client");
    const debugRPC = debug("develop:ganache");
    const ganacheColor = {
      hex: "#ffaf5f", // ganache's color in hex
      xterm: 215 // Xterm's number equivalent
    };
    debugRPC.color = ganacheColor.xterm;

    ipcOptions.retry = ipcOptions.retry || false;
    ipcOptions.log = ipcOptions.log || false;
    ipcOptions.network = ipcOptions.network || "develop";
    var ipcNetwork = ipcOptions.network;

    var ipc = new IPC();
    ipc.config.appspace = "truffle.";

    // set connectPath explicitly
    var dirname = ipc.config.socketRoot;
    var basename = `${ipc.config.appspace}${ipcNetwork}`;
    var connectPath = path.join(dirname, basename);
    var loggers = {};

    ipc.config.silent = !debugClient.enabled;
    ipc.config.logger = debugClient;

    const sanitizeAndCallFn =
      fn =>
      (...args) => {
        // HACK-y: replace `{}` that is getting logged instead of ""
        // var args = Array.prototype.slice.call(arguments);
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          Object.keys(args[0]).length === 0
        ) {
          args[0] = "";
        }
        fn.apply(undefined, args);
      };

    if (debugServer.enabled) {
      loggers.ipc = debugServer;
    }

    // create a logger to present Ganache's console log messages
    const createSolidityLogger = prefix => {
      if (prefix == null || typeof prefix !== "string") {
        prefix = "";
      }

      return maybeMultipleLines =>
        maybeMultipleLines.split("\n").forEach(
          // decorate each line's prefix.
          line => console.log(chalk.hex(ganacheColor.hex)(` ${prefix}`), line)
        );
    };

    // enable output/logger for solidity console.log
    loggers.solidity = sanitizeAndCallFn(
      createSolidityLogger(
        truffleConfig.solidityLog && truffleConfig.solidityLog.prefix
      )
    );

    if (ipcOptions.log) {
      debugRPC.enabled = true;
      loggers.ganache = sanitizeAndCallFn(debugRPC);
    }

    if (!ipcOptions.retry) {
      ipc.config.maxRetries = 0;
    }

    var disconnect = function () {
      ipc.disconnect(ipcNetwork);
    };

    return new Promise((resolve, reject) => {
      ipc.connectTo(ipcNetwork, connectPath, function () {
        ipc.of[ipcNetwork].on("destroy", function () {
          reject(new Error("IPC connection destroyed"));
        });

        ipc.of[ipcNetwork].on("truffle.ready", function () {
          resolve(disconnect);
        });

        Object.keys(loggers).forEach(function (key) {
          var log = loggers[key];
          if (log) {
            var message = `truffle.${key}.log`;
            ipc.of[ipcNetwork].on(message, log);
          }
        });
      });
    });
  },

  /**
   * Connect to a managed Ganache service. This will connect to an existing
   * Ganache service if one exists, or, create a new one to connect to.
   *
   * @param {Object} ipcOptions
   * @param {string} ipcOptions.network the network name.
   * @param {Object} ganacheOptions to be used if starting a Ganache service is
   *        necessary.
   * @param {TruffleConfig} truffleConfig the truffle config.
   * @returns void
   */
  connectOrStart: async function (ipcOptions, ganacheOptions, truffleConfig) {
    ipcOptions.retry = false;

    const ipcNetwork = ipcOptions.network || "develop";

    let started = false;
    let disconnect;

    try {
      disconnect = await this.connect(ipcOptions, truffleConfig);
    } catch (_error) {
      await this.start(ipcNetwork, ganacheOptions);
      ipcOptions.retry = true;
      disconnect = await this.connect(ipcOptions, truffleConfig);
      started = true;
    } finally {
      return {
        disconnect,
        started
      };
    }
  }
};

module.exports = Develop;
