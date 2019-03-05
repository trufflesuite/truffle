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
  unbox: async (url, destination, options = {}, config) => {
    const { eventManager } = config;
    let tempDirCleanup;
    options.logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force
    };

    try {
      const tempDir = await utils.setUpTempDirectory(eventManager);
      tempDirPath = tempDir.path;
      tempDirCleanup = tempDir.cleanupCallback;

      await utils.downloadBox(url, tempDirPath, eventManager);

      const boxConfig = await utils.readBoxConfig(tempDirPath);

      await utils.unpackBox(
        tempDirPath,
        destination,
        boxConfig,
        unpackBoxOptions
      );

      eventManager.emit("unbox:cleaningTempFiles:start");
      tempDirCleanup();
      eventManager.emit("unbox:cleaningTempFiles:end");

      await utils.setUpBox(boxConfig, destination, eventManager);

      return boxConfig;
    } catch (error) {
      if (tempDirCleanup) tempDirCleanup();
      eventManager.emit("unbox:jobFailed");
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
