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
        if (boxConfig.epilogue) {
          options.logger.log(project_config.epilogue.replace("\n", OS.EOL));
        }

        return boxConfig;
      });
  }
};

module.exports = Box;
