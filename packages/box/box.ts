import "source-map-support/register";
import utils from "./lib/utils";
import tmp from "tmp";
import path from "path";
import Config from "@truffle/config";
import fse from "fs-extra";
import inquirer from "inquirer";
import { sandboxOptions, unboxOptions } from "typings";

/*
 * accepts a number of different url and org/repo formats and returns the
 * format required by https://www.npmjs.com/package/download-git-repo for remote URLs
 * or absolute path to local folder if the source is local folder
 *
 * supported input formats are as follows:
 *   - org/repo[#branch]
 *   - https://github.com(/|:)<org>/<repo>[.git][#branch]
 *   - git@github.com:<org>/<repo>[#branch]
 *   - path to local folder (absolute, relative or ~/home)
 */
const normalizeSourcePath = (
  url = "https://github.com:trufflesuite/truffle-init-default"
) => {
  if (url.startsWith(".") || url.startsWith("/") || url.startsWith("~")) {
    return path.resolve(path.normalize(url));
  }
  // remove the .git from the repo specifier
  if (url.includes(".git")) {
    url = url.replace(/.git$/, "");
    url = url.replace(/.git#/, "#");
    url = url.replace(/.git:/, ":");
  }

  // rewrite https://github.com/truffle-box/metacoin format in
  //         https://github.com:truffle-box/metacoin format
  if (url.match(/.com\//)) {
    url = url.replace(/.com\//, ".com:");
  }

  // full URL already
  if (url.includes("://")) {
    return url;
  }

  if (url.includes("git@")) {
    return url.replace("git@", "https://");
  }

  if (url.split("/").length === 2) {
    // `org/repo`
    return `https://github.com:${url}`;
  }

  if (!url.includes("/")) {
    // repo name only
    if (!url.includes("-box")) {
      // check for branch
      if (!url.includes("#")) {
        url = `${url}-box`;
      } else {
        const index = url.indexOf("#");
        url = `${url.substr(0, index)}-box${url.substr(index)}`;
      }
    }
    return `https://github.com:truffle-box/${url}`;
  }
  throw new Error("Box specified in invalid format");
};

const parseSandboxOptions = (options: sandboxOptions) => {
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
};

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
      const normalizedSourcePath = normalizeSourcePath(url);

      await Box.checkDir(options, destination);
      const tempDir = await utils.setUpTempDirectory(events);
      const tempDirPath = tempDir.path;
      tempDirCleanup = tempDir.cleanupCallback;

      await utils.downloadBox(normalizedSourcePath, tempDirPath, events);

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
      `https://github.com:trufflesuite/truffle-init-${name}`,
      tmpDir.name,
      unboxOptions,
      config
    );
    return Config.load(path.join(tmpDir.name, "truffle-config.js"), {});
  }
};

export = Box;
