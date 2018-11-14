var utils = require("./lib/utils");
var tmp = require("tmp");
var path = require("path");

var Config = require("truffle-config");

function parseSandboxOptions(options) {
  if (typeof options === "function") {
    return {
      name: "default",
      unsafeCleanup: false,
      setGracefulCleanup: false
    };
  } else if (typeof options === "string") {
    // back compatibility for when `options` used to be `name`
    return {
      name: options,
      unsafeCleanup: false,
      setGracefulCleanup: false
    };
  } else if (typeof options === "object") {
    return {
      name: options.name || "default",
      unsafeCleanup: options.unsafeCleanup || false,
      setGracefulCleanup: options.setGracefulCleanup || false
    };
  }
}

var Box = {
  unbox: function(url, destination, options) {
    options = options || {};
    options.logger = options.logger || {log: () => {}};
    const downloadBoxOptions = {
      force: options.force
    };

    return Promise.resolve()
      .then(() => {
        options.logger.log("Downloading...");

        return utils.downloadBox(url, destination, downloadBoxOptions);
      })
      .then(() => {
        options.logger.log("Unpacking...");

        return utils.unpackBox(destination);
      })
      .then((boxConfig) => {
        options.logger.log("Setting up...");

        return utils.setupBox(boxConfig, destination);
      })
      .then((boxConfig) => boxConfig);
  },

  // options.unsafeCleanup
  //   Recursively removes the created temporary directory, even when it's not empty. default is false
  // options.setGracefulCleanup
  //   Cleanup temporary files even when an uncaught exception occurs
  sandbox: function(options, callback) {
    var self = this;

    const {name, unsafeCleanup, setGracefulCleanup} = parseSandboxOptions(
      options
    );

    if (typeof options === "function") {
      callback = options;
    }

    if (setGracefulCleanup) {
      tmp.setGracefulCleanup();
    }

    tmp.dir({unsafeCleanup}, function(err, dir) {
      if (err) {
        return callback(err);
      }

      self
        .unbox("https://github.com/trufflesuite/truffle-init-" + name, dir)
        .then(function() {
          var config = Config.load(path.join(dir, "truffle.js"), {});
          callback(null, config);
        })
        .catch(callback);
    });
  }
};

module.exports = Box;
