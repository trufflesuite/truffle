const { IPC } = require("node-ipc");
const path = require("path");
const { spawn } = require("child_process");
const debug = require("debug");

const Develop = {
  start: async function(ipcNetwork, options) {
    options = options || {};

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

    return spawn("node", [chainPath, ipcNetwork, JSON.stringify(options)], {
      detached: true,
      stdio: "ignore"
    });
  },

  connect: function(options, callback) {
    const debugServer = debug("develop:ipc:server");
    const debugClient = debug("develop:ipc:client");
    const debugRPC = debug("develop:ganache");

    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    options.retry = options.retry || false;
    options.log = options.log || false;
    options.network = options.network || "develop";
    var ipcNetwork = options.network;

    var ipc = new IPC();
    ipc.config.appspace = "truffle.";

    // set connectPath explicitly
    var dirname = ipc.config.socketRoot;
    var basename = `${ipc.config.appspace}${ipcNetwork}`;
    var connectPath = path.join(dirname, basename);

    ipc.config.silent = !debugClient.enabled;
    ipc.config.logger = debugClient;

    var loggers = {};

    if (debugServer.enabled) {
      loggers.ipc = debugServer;
    }

    if (options.log) {
      debugRPC.enabled = true;

      loggers.ganache = function() {
        // HACK-y: replace `{}` that is getting logged instead of ""
        var args = Array.prototype.slice.call(arguments);
        if (
          args.length === 1 &&
          typeof args[0] === "object" &&
          Object.keys(args[0]).length === 0
        ) {
          args[0] = "";
        }

        debugRPC.apply(undefined, args);
      };
    }

    if (!options.retry) {
      ipc.config.maxRetries = 0;
    }

    var disconnect = function() {
      ipc.disconnect(ipcNetwork);
    };

    ipc.connectTo(ipcNetwork, connectPath, function() {
      ipc.of[ipcNetwork].on("destroy", function() {
        callback(new Error("IPC connection destroyed"));
      });

      ipc.of[ipcNetwork].on("truffle.ready", function() {
        callback(null, disconnect);
      });

      Object.keys(loggers).forEach(function(key) {
        var log = loggers[key];
        if (log) {
          var message = `truffle.${key}.log`;
          ipc.of[ipcNetwork].on(message, log);
        }
      });
    });
  },

  connectOrStart: function(options, ganacheOptions, callback) {
    const self = this;

    options.retry = false;

    const ipcNetwork = options.network || "develop";

    let connectedAlready = false;

    this.connect(
      options,
      async function(error, disconnect) {
        if (error) {
          await self.start(ipcNetwork, ganacheOptions);

          options.retry = true;
          self.connect(
            options,
            function(error, disconnect) {
              if (connectedAlready) return;

              connectedAlready = true;
              callback(true, disconnect);
            }
          );
        } else {
          connectedAlready = true;
          callback(false, disconnect);
        }
      }
    );
  }
};

module.exports = Develop;
