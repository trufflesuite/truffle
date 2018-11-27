const unbox = require("./unbox");
const fs = require("fs");
const config = require("../config");
const tmp = require("tmp");
const cwd = require("process").cwd();
const path = require("path");

module.exports = {
  downloadBox: (url, destination) =>
    Promise.resolve()
      .then(() => unbox.verifyURL(url))
      .then(() => unbox.fetchRepository(url, destination)),

  readBoxConfig: destination => {
    const possibleConfigs = [
      path.join(destination, "truffle-box.json"),
      path.join(destination, "truffle-init.json")
    ];

    const configPath = possibleConfigs.reduce(function(path, alt) {
      return path || (fs.existsSync(alt) && alt);
    }, undefined);

    return config.read(configPath);
  },

  setUpTempDirectory: () =>
    new Promise((resolve, reject) => {
      const options = {
        dir: cwd,
        unsafeCleanup: true
      };
      tmp.dir(options, (error, dir, cleanupCallback) => {
        if (error) return reject(error);

        resolve({
          tempDirPath: path.join(dir, "box"),
          cleanupCallback
        });
      });
    }),

  unpackBox: (tempDir, destination, boxConfig, unpackBoxOptions) => {
    return Promise.resolve()
      .then(() => unbox.prepareToCopyFiles(tempDir, boxConfig))
      .then(() =>
        unbox.copyTempIntoDestination(tempDir, destination, unpackBoxOptions)
      );
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
