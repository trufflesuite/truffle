var utils = require("./lib/utils");

var Box = {
  unbox: function(truffleConfig, url, destination) {
    return Promise.resolve()
      .then(function() {
        return utils.downloadBox(url, destination)
      })
      .then(function() {
        return utils.unpackBox(destination);
      })
      .then(function(boxConfig) {
        return boxConfig;
      });
  }
};

module.exports = Box;
