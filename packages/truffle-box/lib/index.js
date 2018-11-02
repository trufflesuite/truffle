const utils = require("./utils");
const tmp = require("tmp");
const path = require("path");
const Config = require("truffle-config");

const BoxManager = {
  unbox(url, destination, options = {}) {
    options.logger = options.logger || { log: () => {} };

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
      .then(boxConfig => {
        options.logger.log("Setting up...");
        return utils.setupBox(boxConfig, destination);
      })
      .then(boxConfig => boxConfig);
  },

  sandbox(name, callback) {
    const self = this;
    if (typeof name === "function") {
      callback = name;
      name = "default";
    }

    tmp.dir((err, dir) => {
      if (err) {
        return callback(err);
      }

      self
        .unbox(`https://github.com/trufflesuite/truffle-init-${name}`, dir)
        .then(() => {
          const config = Config.load(path.join(dir, "truffle.js"), {});
          callback(null, config);
        })
        .catch(callback);
    });
  }
};

module.exports = BoxManager;
