const unbox = require("./unbox");
const fs = require("fs");
const config = require("../config");
const tmp = require("tmp");
const cwd = require("process").cwd();
const path = require("path");

module.exports = {
  downloadBox: async (url, destination, eventManager) => {
    eventManager.emit("unbox:downloadingBox:start");
    try {
      await unbox.verifyURL(url);
      await unbox.fetchRepository(url, destination);
      eventManager.emit("unbox:downloadingBox:end");
    } catch (error) {
      eventManager.emit("unbox:fail");
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

  setUpTempDirectory: eventManager => {
    eventManager.emit("unbox:preparingToDownload:start");
    return new Promise((resolve, reject) => {
      const options = {
        dir: cwd,
        unsafeCleanup: true
      };
      tmp.dir(options, (error, dir, cleanupCallback) => {
        if (error) {
          eventManager.emit("unbox:fail");
          return reject(error);
        }

        eventManager.emit("unbox:preparingToDownload:end");
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

  setUpBox: async (boxConfig, destination, eventManager) => {
    eventManager.emit("unbox:settingUpBox:start");
    try {
      await unbox.installBoxDependencies(boxConfig, destination);
      eventManager.emit("unbox:settingUpBox:end");
    } catch (error) {
      eventManager.emit("unbox:fail");
      throw new Error(error);
    }
  }
};
