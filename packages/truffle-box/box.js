const utils = require("./lib/utils");
const tmp = require("tmp");
const path = require("path");
const Config = require("truffle-config");
const fse = require("fs-extra");
const inquirer = require("inquirer");

function parseSandboxOptions(options) {
  if (typeof options === "string") {
    // back compatibility for when `options` used to be `name`
    return {
      name: options,
      unsafeCleanup: false,
      setGracefulCleanup: false
    };
  } else if (typeof options === "object") {
    return {
      name: options.name || "default",
      unsafeCleanup: options.unsafeCleanup || false,
      setGracefulCleanup: options.setGracefulCleanup || false
    };
  }
}

const Box = {
  unbox: async (url, destination, options = {}, config) => {
    const { events } = config;
    let tempDirCleanup;
    logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force
    };

    try {
      await Box.checkDir(options, destination);
      const tempDir = await utils.setUpTempDirectory(events);
      tempDirPath = tempDir.path;
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

  checkDir: async (options = {}, destination) => {
    let logger = options.logger || console;
    if (!options.force) {
      const unboxDir = fse.readdirSync(destination);
      if (unboxDir.length) {
        logger.log(`This directory is non-empty...`);
        const prompt = [
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
  sandbox: async options => {
    const { name, unsafeCleanup, setGracefulCleanup } = parseSandboxOptions(
      options
    );

    if (setGracefulCleanup) tmp.setGracefulCleanup();

    let config = new Config();
    const tmpDir = tmp.dirSync({ unsafeCleanup });
    await Box.unbox(
      `https://github.com/trufflesuite/truffle-init-${name}`,
      tmpDir.name,
      options,
      config
    );
    return Config.load(path.join(tmpDir.name, "truffle-config.js"), {});
  }
};

module.exports = Box;
