var utils = require("./lib/utils");

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
  }
};

module.exports = Box;
