const utils = require("./lib/utils");
const tmp = require("tmp");
const path = require("path");
const Config = require("truffle-config");
const ora = require("ora");

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
  unbox: (url, destination, options) => {
    let boxConfig, tempCleanupCallback, tempDir;
    options = options || {};
    options.logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force
    };
    let downloadSpinner,
      readConfigSpinner,
      prepareSpinner,
      setUpSpinner,
      cleanUpSpinner;

    return Promise.resolve()
      .then(() => {
        options.logger.log("");
        prepareSpinner = ora("Preparing to download").start();
        return utils.setUpTempDirectory();
      })
      .then(({ tempDirPath, cleanupCallback }) => {
        tempCleanupCallback = cleanupCallback;
        tempDir = tempDirPath;
        prepareSpinner.succeed();
        downloadSpinner = ora("Downloading").start();
        return utils.downloadBox(url, tempDirPath);
      })
      .then(() => {
        downloadSpinner.succeed();
        readConfigSpinner = ora("Reading config").start();
        return utils.readBoxConfig(tempDir);
      })
      .then(config => {
        readConfigSpinner.succeed();
        boxConfig = config;
        return utils.unpackBox(
          tempDir,
          destination,
          boxConfig,
          unpackBoxOptions
        );
      })
      .then(() => {
        cleanUpSpinner = ora("Cleaning up").start();
        tempCleanupCallback();
      })
      .then(() => {
        cleanUpSpinner.succeed();
        setUpSpinner = ora("Setting up box").start();
        return utils.setupBox(boxConfig, destination);
      })
      .then(boxConfig => {
        setUpSpinner.succeed();
        return boxConfig;
      })
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
