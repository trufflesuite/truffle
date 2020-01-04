import unbox from "./unbox";
import fs from "fs";
import config from "../config";
import tmp from "tmp";
import process from "process";
const cwd = require("process").cwd();
import path from "path";
import { boxConfig, unboxOptions } from "typings";

export = {
  downloadBox: async (url: string, destination: string, events: any) => {
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

  readBoxConfig: async (destination: string) => {
    const possibleConfigs = [
      path.join(destination, "truffle-box.json"),
      path.join(destination, "truffle-init.json")
    ];

    const configPath = possibleConfigs.reduce(
      (path, alt) => path || (fs.existsSync(alt) && alt),
      undefined
    );

    return await config.read(configPath);
  },

  setUpTempDirectory: (events: any) => {
    events.emit("unbox:preparingToDownload:start");
    const options = {
      dir: process.cwd(),
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

  unpackBox: async (
    tempDir: string,
    destination: string,
    boxConfig: boxConfig,
    unpackBoxOptions: unboxOptions
  ) => {
    unbox.prepareToCopyFiles(tempDir, boxConfig);
    await unbox.copyTempIntoDestination(tempDir, destination, unpackBoxOptions);
  },

  setUpBox: (boxConfig: boxConfig, destination: string, events: any) => {
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
