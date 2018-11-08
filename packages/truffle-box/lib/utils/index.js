var unbox = require('./unbox');

module.exports = {
  downloadBox: function(url, destination, options) {
    var tmpDir;
    var tmpCleanup;

    return Promise.resolve()
      .then(() => unbox.verifyURL(url))
      .then(() => unbox.setupTempDirectory())
      .then((dir, func) => {
        // save tmpDir result
        tmpDir = dir;
        tmpCleanup = func;
      })
      .then(() => unbox.fetchRepository(url, tmpDir))
      .then(() => unbox.copyTempIntoDestination(tmpDir, destination, options.force))
      .then(tmpCleanup);
  },

  unpackBox: function(destination) {
    var boxConfig;

    return Promise.resolve()
      .then(function() {
        return unbox.readBoxConfig(destination);
      })
      .then(function(cfg) {
        boxConfig = cfg;
      })
      .then(function() {
        return unbox.cleanupUnpack(boxConfig, destination);
      })
      .then(function() {
        return boxConfig;
      });
  },

  setupBox: function(boxConfig, destination) {
    return Promise.resolve()
      .then(function() {
        return unbox.installBoxDependencies(boxConfig, destination);
      })
      .then(function() {
        return boxConfig;
      });
  }
};
