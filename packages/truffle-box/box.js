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
  unbox: async (url, destination, options = {}) => {
    let tempDirCleanup;
    options.logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force
    };

    try {
      options.eventEmitter.emitEvent("unbox:preparingToDownload");
      const tempDir = await utils.setUpTempDirectory();
      tempDirPath = tempDir.path;
      tempDirCleanup = tempDir.cleanupCallback;

      options.eventEmitter.emitEvent("unbox:downloadingBox");
      await utils.downloadBox(url, tempDirPath);

      const boxConfig = await utils.readBoxConfig(tempDirPath);

      await utils.unpackBox(
        tempDirPath,
        destination,
        boxConfig,
        unpackBoxOptions
      );

      options.eventEmitter.emitEvent("unbox:cleaningTempFiles");
      tempDirCleanup();

      options.eventManager.emitEvent("unbox:settingUpBox");
      await utils.setUpBox(boxConfig, destination);

      return boxConfig;
    } catch (error) {
      if (tempDirCleanup) tempDirCleanup();
      options.eventEmitter.emitEvent("unbox:jobFailed");
      throw new Error(error);
    }
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
          var config = Config.load(path.join(dir, "truffle-config.js"), {});
          callback(null, config);
        })
        .catch(callback);
    });
  }
};

module.exports = Box;
