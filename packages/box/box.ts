import utils from "./lib/utils";
import tmp from "tmp";
import path from "path";
import Config from "@truffle/config";
import fse from "fs-extra";
import inquirer from "inquirer";
import { sandboxOptions, unboxOptions } from "typings";
import debugModule from "debug";

const debug = debugModule("unbox");
const defaultPath = "git@github.com:trufflesuite/truffle-init-default";

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
export const normalizeSourcePath = (url = defaultPath) => {
  // Process filepath resolution
  //
  if (url.startsWith(".") || url.startsWith("/") || url.startsWith("~")) {
    debug({ in: url, out: path.normalize(url) });
    return path.resolve(path.normalize(url));
  }

  // process https? or git prefixed input
  //
  if (/^(https?|git)/i.test(url) ){
    const protocolRex = new RegExp(
      "(?<protocol>(https://|git@))"  + 
      "(?<service>[^@/]+)"            + // service
      "(/|:)"                         + // separator. will be ignored in ouput
      "(?<org>[^/#]+)"                + // org
      "/"                             +
      "(?<repo>[^/#]+)"               + // repo
      "#?"                            + // optional branch separator
      "(?<branch>[^#]+)?"             + // capture branch (undefined if unmatched)
      "$",
      "i"                               // case insensitive
    );

    const match = url.match(protocolRex);
    if (match) {
      const { groups: G } = match;
      const branch = G['branch'] ? `#${G['branch']}` : '';
      const repo = G['repo'].replace(/\.git$/i, '');
      const result = `https://${G['service']}:${G['org']}/${repo}${branch}`;
      debug({ in: url, out: result});
      return result;
    }

    debug({ in: url, error: "InvalidFormat (protocol)", hint: "did not match protocol" });
    throw new Error("Box specified with invalid format (git/https)");
  }

  // default case: process [org/] + repo + [ #branch/name/with/slashes ]
  //
  const orgRepoBranchRex = new RegExp(
    "^"                             +
    "(?<org>[^/]+/)?"               + // optional org
    "(?<repo>[^#/]+)"               + // repo
    "(?<branch>#[^#]+)?"            + // optional branch (undefined if unmatched)
    "$"                               // no extras!
  );

  const match = url.match(orgRepoBranchRex);
  if (match) {
    const { groups: G } = match;

    // `truffle-box` is the default org
    const org = G["org"] || "truffle-box/";
    const branch = G["branch"] || "";

    // repo should have`-box` suffix
    let repo = G['repo'];
    repo = repo.endsWith('-box') ? repo : `${repo}-box`;

    const result = `https://github.com:${org}${repo}${branch}`;

    debug({ in: url, out: result});
    return result;
  }

  // No match, it's an error!
  debug({ in: url, error: "InvalidFormat", hint: "matched nothing" });
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
      force: false,
    };
  } else if (typeof options === "object") {
    return {
      name: options.name || "default",
      unsafeCleanup: options.unsafeCleanup || false,
      setGracefulCleanup: options.setGracefulCleanup || false,
      logger: options.logger || console,
      force: options.force || false,
    };
  }
};

const Box = {
  unbox: async (
    url: string,
    destination: string,
    options: unboxOptions = {},
    config: any,
  ) => {
    const { events } = config;
    let tempDirCleanup;
    const logger = options.logger || { log: () => {} };
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force,
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
        unpackBoxOptions,
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
            default: true,
          },
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
      force,
    } = parseSandboxOptions(options);

    const boxPath = name.replace(/^default(?=#|$)/, defaultPath);
    //ordinarily, this line will have no effect.  however, if the name is "default",
    //possibly with a branch specification, this replaces it appropriately
    //(this is necessary in order to keep using trufflesuite/truffle-init-default
    //instead of truffle-box/etc)

    if (setGracefulCleanup) tmp.setGracefulCleanup();

    let config = new Config();
    const tmpDir = tmp.dirSync({ unsafeCleanup });
    const unboxOptions = { logger, force };
    await Box.unbox(boxPath, tmpDir.name, unboxOptions, config);
    return Config.load(path.join(tmpDir.name, "truffle-config.js"), {});
  },
};

export default Box;
