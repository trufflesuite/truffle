const unbox = require("./unbox");
const fs = require("fs");
const config = require("../config");
const tmp = require("tmp");
const cwd = require("process").cwd();
const path = require("path");

module.exports = {
  downloadBox: async (url, destination, events) => {
    events.emit("unbox:downloadingBox:start");
    try {
      await unbox.verifyURL(url);
      await unbox.fetchRepository(url, destination);
      events.emit("unbox:downloadingBox:succeed");
    } catch (error) {
      events.emit("unbox:fail");
      throw new Error(error);
    }
  },

  readBoxConfig: async destination => {
    const possibleConfigs = [
      path.join(destination, "truffle-box.json"),
      path.join(destination, "truffle-init.json")
    ];

    const configPath = possibleConfigs.reduce((path, alt) => {
      return path || (fs.existsSync(alt) && alt);
    }, undefined);

    try {
      const boxConfig = await config.read(configPath);
      return boxConfig;
    } catch (error) {
      throw new Error(error);
    }
  },

  setUpTempDirectory: events => {
    events.emit("unbox:preparingToDownload:start");
    return new Promise((resolve, reject) => {
      const options = {
        dir: cwd,
        unsafeCleanup: true
      };
      tmp.dir(options, (error, dir, cleanupCallback) => {
        if (error) {
          events.emit("unbox:fail");
          return reject(error);
        }

        events.emit("unbox:preparingToDownload:succeed");
        resolve({
          path: path.join(dir, "box"),
          cleanupCallback
        });
      });
    });
  },

  unpackBox: async (tempDir, destination, boxConfig, unpackBoxOptions) => {
    await unbox.prepareToCopyFiles(tempDir, boxConfig);
    await unbox.copyTempIntoDestination(tempDir, destination, unpackBoxOptions);
  },

  setUpBox: async (boxConfig, destination, events) => {
    events.emit("unbox:settingUpBox:start");
    try {
      await unbox.installBoxDependencies(boxConfig, destination);
      events.emit("unbox:settingUpBox:succeed");
    } catch (error) {
      events.emit("unbox:fail");
      throw new Error(error);
    }
  }
};
