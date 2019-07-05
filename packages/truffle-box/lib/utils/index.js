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
      throw error;
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

    return await config.read(configPath);
  },

  setUpTempDirectory: events => {
    events.emit("unbox:preparingToDownload:start");
    const options = {
      dir: cwd,
      unsafeCleanup: true
    };
    try {
      const tmpDir = tmp.dirSync(options);
      events.emit("unbox:preparingToDownload:succeed");
      return {
        path: path.join(tmpDir.name, "box"),
        cleanupCallback: tmpDir.removeCallback
      };
    } catch (error) {
      events.emit("unbox:fail");
      throw error;
    }
  },

  unpackBox: async (tempDir, destination, boxConfig, unpackBoxOptions) => {
    unbox.prepareToCopyFiles(tempDir, boxConfig);
    await unbox.copyTempIntoDestination(tempDir, destination, unpackBoxOptions);
  },

  setUpBox: (boxConfig, destination, events) => {
    events.emit("unbox:settingUpBox:start");
    try {
      unbox.installBoxDependencies(boxConfig, destination);
      events.emit("unbox:settingUpBox:succeed");
    } catch (error) {
      events.emit("unbox:fail");
      throw error;
    }
  }
};
