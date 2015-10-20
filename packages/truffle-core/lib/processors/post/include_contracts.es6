var PuddingLoader = require("ether-pudding/loader");

module.exports = function(contents, file, config, process, callback) {
  PuddingLoader.packageSource(config.environments.current.directory, function(err, result) {
    if (err != null) {
      callback(err);
    } else {
      callback(null, result + contents);
    }
  });
};
