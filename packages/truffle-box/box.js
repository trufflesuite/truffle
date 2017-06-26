var utils = require("./lib/utils");

var Box = {
  unbox: function(url, destination, options) {
    options = options || {};
    options.logger = options.logger || {log: function() {}}

    return Promise.resolve()
      .then(function() {
        options.logger.log("Downloading Box");
        return utils.downloadBox(url, destination)
      })
      .then(function() {
        options.logger.log("Unpacking Box");
        return utils.unpackBox(destination);
      })
      .then(function(boxConfig) {
        options.logger.log("Installing box dependencies");
        return utils.setupBox(boxConfig, destination)
      })
      .then(function(boxConfig) {
        return boxConfig;
      });
  }
};

module.exports = Box;
