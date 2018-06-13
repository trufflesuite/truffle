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
    if (typeof name === "function") {
      callback = name;
      name = "default";
    }

    tmp.dir(function(err, dir, cleanupCallback) {
      if (err) {
        return callback(err);
      }

      self.unbox("https://github.com/trufflesuite/truffle-init-" + name, dir)
        .then(function() {
          var config = Config.load(path.join(dir, "truffle.js"), {});
          callback(null, config);
        })
        .catch(callback);
    });
  }
};

module.exports = Box;
