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

    return await config.read(configPath);
  },

  setUpTempDirectory: async() => {
    const prepareSpinner = await ora("Preparing to download").start();
      const options = {
        dir: cwd,
        unsafeCleanup: true
      };
    try {
      const tmpDir = await tmp.dirSync(options)
      await prepareSpinner.succeed();
      return { path: path.join(tmpDir.name, "box"),
        cleanupCallback: tmpDir.removeCallback
      }
    } catch (e) {
      await prepareSpinner.fail();
      throw new Error(e)
    }
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
      throw new Error(error);
    }
  }
};
