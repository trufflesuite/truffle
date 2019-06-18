const unbox = require("./unbox");
const fs = require("fs");
const config = require("../config");
const tmp = require("tmp");
const cwd = require("process").cwd();
const path = require("path");
const ora = require("ora");

module.exports = {
  downloadBox: async (url, destination) => {
    const downloadSpinner = ora("Downloading").start();
    try {
      await unbox.verifyURL(url);
      await unbox.fetchRepository(url, destination);
      downloadSpinner.succeed();
    } catch (error) {
      downloadSpinner.fail();
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

    try {
      const boxConfig = await config.read(configPath);
      return boxConfig;
    } catch (error) {
      throw new Error(error);
    }
  },

  setUpTempDirectory: () => {
    const prepareSpinner = ora("Preparing to download").start();
    return new Promise((resolve, reject) => {
      const options = {
        dir: cwd,
        unsafeCleanup: true
      };
      tmp.dir(options, (error, dir, cleanupCallback) => {
        if (error) {
          prepareSpinner.fail();
          return reject(error);
        }

        prepareSpinner.succeed();
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

  setUpBox: async (boxConfig, destination) => {
    const setUpSpinner = ora("Setting up box").start();
    try {
      await unbox.installBoxDependencies(boxConfig, destination);
      setUpSpinner.succeed();
    } catch (error) {
      setUpSpinner.fail();
      throw error;
    }
  }
};
