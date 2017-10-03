var ipc = require('node-ipc');
var path = require('path');
var spawn = require('child_process').spawn;

var Develop = {
  start: function(testrpcOptions, callback) {
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

    var cmd = spawn("node", [chainPath, JSON.stringify(testrpcOptions)], {
      detached: true
    });

    var callbackCalled = false;

    cmd.stdout.on('data', function(data) {
      // // Print anything our chain process outputs (not much).
      // // Trim or else we'll have double new lines.
      // config.logger.log(data.toString().trim());

      // Here, we use on('data') to tell us if the application
      // has started correctly. We'll call the callback and setup
      // the configuration once get our first output on stdout.
      // Note: Chain errors go to stderr (see below).
      if (callbackCalled) return;

      callbackCalled = true;

      ipc.connectTo('truffleDevelop', function() {
        ipc.of.truffleDevelop.on('connect', function() {
          callback();
        });
      });
    });

    cmd.stderr.on('data', function(data) {
      // Log any chain errors.
      // config.logger.log(data.toString().trim());
    });

    cmd.on('error', function(err) {
      // If ther'es a bigger error, throw it.
      throw err;
    });
  },

  connect: function(callback) {
    ipc.config.maxRetries = 0;
    ipc.config.silent = true;

    ipc.connectTo('truffleDevelop', function() {
      ipc.of.truffleDevelop.on('error', function(error) {
        callback(error);
      });

      ipc.of.truffleDevelop.on('connect', function() {
        callback();
      });
    });
  },

  connectOrStart: function(testrpcOptions, callback) {
    var self = this;

    this.connect(function(error) {
      if (error) {
        self.start(testrpcOptions, function() { callback(true); });
      } else {
        callback(false);
      }
    });
  }
};

module.exports = Develop;
