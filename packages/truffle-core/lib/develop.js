var IPC = require('node-ipc').IPC;
var path = require('path');
var spawn = require('child_process').spawn;
var debug = require('debug');

var Develop = {
  start: function(ipcNetwork, options, callback) {
    options = options || {};

    var chainPath;

    // The path to the dev env process depends on whether or not
    // we're running in the bundled version. If not, use chain.js
    // directly, otherwise let the bundle point at the bundled version.
    if (typeof BUNDLE_CHAIN_FILENAME != "undefined") {
      // Remember: In the bundled version, __dirname refers to the
      // build directory where cli.bundled.js and cli.chain.js live.
      chainPath = path.join(__dirname, BUNDLE_CHAIN_FILENAME);
    } else {
      chainPath = path.join(__dirname, "../", "chain.js");
    }

    var cmd = spawn("node", [chainPath, ipcNetwork, JSON.stringify(options)], {
      detached: true,
      stdio: 'ignore'
    });

    callback();
  },

  connect: function(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    options.retry = options.retry || false;
    options.log = options.log || false;
    options.network = options.network || "develop";
    var ipcNetwork = options.network;

    var ipc = new IPC();
    ipc.config.appspace = "truffle.";

    var debugServer = debug('develop:ipc:server');
    var debugClient = debug('develop:ipc:client');
    var debugRPC = debug('develop:testrpc');

    ipc.config.silent = !debugClient.enabled;
    ipc.config.logger = debugClient;

    var loggers = {};

    if (debugServer.enabled) {
      loggers.ipc = debugServer;
    }

    if (options.log) {
      loggers.testrpc = debugRPC;
      debugRPC.enabled = true;
    }

    if (!options.retry) {
      ipc.config.maxRetries = 0;
    }

    ipc.connectTo(ipcNetwork, function() {
      ipc.of[ipcNetwork].on('destroy', function() {
        callback(new Error("IPC connection destroyed"));
      });

      ipc.of[ipcNetwork].on('truffle.ready', function() {
        callback();
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

  connectOrStart: function(options, testrpcOptions, callback) {
    var self = this;

    options.retry = false;

    var ipcNetwork = options.network || "develop";

    this.connect(options, function(error) {
      if (error) {
        self.start(ipcNetwork, testrpcOptions, function() {
          options.retry = true;
          self.connect(options, function() { callback(true) });
        });
      } else {
        callback(false);
      }
    });
  }
};

module.exports = Develop;
