var utils = require("./lib/utils");
var tmp = require("tmp");
var path = require("path");

var Config = require("truffle-config");

var Box = {
  unbox: function(url, destination, options) {
    options = options || {};
    options.logger = options.logger || {log: function() {}}

    return Promise.resolve()
      .then(function() {
        options.logger.log("Downloading...");
        return utils.downloadBox(url, destination)
      })
      .then(function() {
        options.logger.log("Unpacking...");
        return utils.unpackBox(destination);
      })
      .then(function(boxConfig) {
        options.logger.log("Setting up...");
        return utils.setupBox(boxConfig, destination)
      })
      .then(function(boxConfig) {
        return boxConfig;
      });
  },

  sandbox: function(name, callback) {
    var self = this;
    let urlSuffix;
    if (typeof name === "function") {
      callback = name;
      name = "default";
    }

    tmp.dir(function(err, dir, cleanupCallback) {
      if (err) {
        return callback(err);
      }
      if (name === "default") {
        urlSuffix = "default#truffle-4-test-box";
      } else {
        urlSuffix = name;
      }
      self.unbox("https://github.com/trufflesuite/truffle-init-" + urlSuffix, dir)
        .then(function() {
          var config = Config.load(path.join(dir, "truffle-config.js"), {});
          callback(null, config);
        })
        .catch(callback);
    });
  }
};

module.exports = Box;
