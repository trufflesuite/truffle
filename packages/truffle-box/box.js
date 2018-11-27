const utils = require("./lib/utils");
const tmp = require("tmp");
const path = require("path");
const Config = require("truffle-config");

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

const Box = {
  unbox: function(url, destination, options) {
    let boxConfig, tempCleanupCallback, tempDir;
    options = options || {};
    options.logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      force: options.force
    };

    return Promise.resolve()
      .then(() => {
        options.logger.log("Setting up temporary directory...");

        return utils.setUpTempDirectory();
      })
      .then(({ tempDirPath, cleanupCallback }) => {
        tempCleanupCallback = cleanupCallback;
        tempDir = tempDirPath;
        options.logger.log("Downloading...");

        return utils.downloadBox(url, tempDirPath);
      })
      .then(() => {
        options.logger.log("Reading box config...");

        return utils.readBoxConfig(tempDir);
      })
      .then(config => {
        boxConfig = config;
        options.logger.log("Unpacking...");

        return utils.unpackBox(
          tempDir,
          destination,
          boxConfig,
          unpackBoxOptions
        );
      })
      .then(() => tempCleanupCallback())
      .then(() => {
        options.logger.log("Setting up...");

        return utils.setupBox(boxConfig, destination);
      })
      .then(boxConfig => boxConfig)
      .catch(error => {
        if (tempCleanupCallback) tempCleanupCallback();
        throw new Error(error);
      });
  },

  // options.unsafeCleanup
  //   Recursively removes the created temporary directory, even when it's not empty. default is false
  // options.setGracefulCleanup
  //   Cleanup temporary files even when an uncaught exception occurs
  sandbox: function(options, callback) {
    var self = this;

    const { name, unsafeCleanup, setGracefulCleanup } = parseSandboxOptions(
      options
    );

    if (typeof options === "function") {
      callback = options;
    }

    if (setGracefulCleanup) {
      tmp.setGracefulCleanup();
    }

    tmp.dir({ unsafeCleanup }, function(err, dir) {
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
