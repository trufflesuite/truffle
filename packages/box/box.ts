import "source-map-support/register";
import utils from "./lib/utils";
import tmp from "tmp";
import path from "path";
import Config from "@truffle/config";
import fse from "fs-extra";
import inquirer from "inquirer";
import { sandboxOptions, unboxOptions } from "typings";

function parseSandboxOptions(options: sandboxOptions) {
  if (typeof options === "string") {
    // back compatibility for when `options` used to be `name`
    return {
      name: options,
      unsafeCleanup: false,
      setGracefulCleanup: false,
      logger: console,
      force: false
    };
  } else if (typeof options === "object") {
    return {
      name: options.name || "default",
      unsafeCleanup: options.unsafeCleanup || false,
      setGracefulCleanup: options.setGracefulCleanup || false,
      logger: options.logger || console,
      force: options.force || false
    };
  }
}

const Box = {
  unbox: async (
    url: string,
    destination: string,
    options: unboxOptions = {},
    config: any
  ) => {
    const { events } = config;
    let tempDirCleanup;
    const logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force
    };

    try {
      await Box.checkDir(options, destination);
      const tempDir = await utils.setUpTempDirectory(events);
      const tempDirPath = tempDir.path;
      tempDirCleanup = tempDir.cleanupCallback;

      await utils.downloadBox(url, tempDirPath, events);

      const boxConfig = await utils.readBoxConfig(tempDirPath);

      await utils.unpackBox(
        tempDirPath,
        destination,
        boxConfig,
        unpackBoxOptions
      );

      events.emit("unbox:cleaningTempFiles:start");
      tempDirCleanup();
      events.emit("unbox:cleaningTempFiles:succeed");

      await utils.setUpBox(boxConfig, destination, events);

      return boxConfig;
    } catch (error) {
      if (tempDirCleanup) tempDirCleanup();
      events.emit("unbox:fail");
      throw error;
    }
  },

  checkDir: async (options: unboxOptions = {}, destination: string) => {
    let logger = options.logger || console;
    if (!options.force) {
      const unboxDir = fse.readdirSync(destination);
      if (unboxDir.length) {
        logger.log(`This directory is non-empty...`);
        const prompt: inquirer.Questions = [
          {
            type: "confirm",
            name: "proceed",
            message: `Proceed anyway?`,
            default: true
          }
        ];
        const answer = await inquirer.prompt(prompt);
        if (!answer.proceed) {
          logger.log("Unbox cancelled");
          process.exit();
        }
      }
    }
  },

  // options.unsafeCleanup
  //   Recursively removes the created temporary directory, even when it's not empty. default is false
  // options.setGracefulCleanup
  //   Cleanup temporary files even when an uncaught exception occurs
  sandbox: async (options: sandboxOptions) => {
    const {
      name,
      unsafeCleanup,
      setGracefulCleanup,
      logger,
      force
    } = parseSandboxOptions(options);

    if (setGracefulCleanup) tmp.setGracefulCleanup();

    let config = new Config();
    const tmpDir = tmp.dirSync({ unsafeCleanup });
    const unboxOptions = { logger, force };
    await Box.unbox(
      `https://github.com/trufflesuite/truffle-init-${name}`,
      tmpDir.name,
      unboxOptions,
      config
    );
    return Config.load(path.join(tmpDir.name, "truffle-config.js"), {});
  }
};

export = Box;
