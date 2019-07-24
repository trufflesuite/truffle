import unbox from "./unbox";
import fs from "fs";
import config from "../config";
import tmp from "tmp";
const cwd = require("process").cwd();
import path from "path";
import ora from "ora";

export default {
  downloadBox: async (url: string, destination: string) => {
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

  readBoxConfig: async (destination: string) => {
    const possibleConfigs = [
      path.join(destination, "truffle-box.json"),
      path.join(destination, "truffle-init.json")
    ];

    const configPath = possibleConfigs.reduce((path, alt) => path || (fs.existsSync(alt) && alt), undefined);

    return await config.read(configPath);
  },

  setUpTempDirectory: () => {
    const prepareSpinner = ora("Preparing to download").start();
    const options = {
      dir: cwd,
      unsafeCleanup: true
    };
    try {
      const tmpDir = tmp.dirSync(options);
      prepareSpinner.succeed();
      return {
        path: path.join(tmpDir.name, "box"),
        cleanupCallback: tmpDir.removeCallback
      };
    } catch (error) {
      prepareSpinner.fail();
      throw error;
    }
  },

  unpackBox: async (tempDir: string, destination: string, boxConfig: any, unpackBoxOptions: object) => {
    unbox.prepareToCopyFiles(tempDir, boxConfig);
    await unbox.copyTempIntoDestination(tempDir, destination, unpackBoxOptions);
  },

  setUpBox: (boxConfig: any, destination: string) => {
    const setUpSpinner = ora("Setting up box").start();
    try {
      unbox.installBoxDependencies(boxConfig, destination);
      setUpSpinner.succeed();
    } catch (error) {
      setUpSpinner.fail();
      throw error;
    }
  }
};
