import utils from "./lib/utils";
import tmp from "tmp";
import path from "path";
import Config from "@truffle/config";
import fse from "fs-extra";
import inquirer from "inquirer";
import type { Question } from "inquirer";
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

  // preprocess to reduce regex complexity
  // `https` is not case sensitiv, unlike `git`
  url = url.replace(/^https/i, "https");

  // branch should not end with slash
  const invalidBranch = /\/$/;

  // process https? or git prefixed input
  //
  if (/^(https?|git)/i.test(url)) {
    // This regular expression uses named capture groups to parse input. The
    // format is (?<the-name>the-regex)
    //
    // \w, the word meta character is a member of [A-Za-z0-9_]. all letters,
    // digits and the underscore. Note \w has to be \\w to escape the backslash
    // in a string literal.
    //
    const protocolRex = new RegExp(
      [
        // match either `htps://` or `git@`
        "(?<protocol>(https://|git@))",

        // service is 1 or many (word, dot or dash)
        "(?<service>[\\w.-]+)",

        // match either `/` or `:`
        "(/|:)",

        // org is 1 or many (word, dot or dash)
        "(?<org>[\\w.-]+)",

        "/",

        // repo is 1 or many (word, dot or dash)
        "(?<repo>[\\w.-]+)",

        // branch is 1 or many (word, dot or dash) and can be optional
        "(?<branch>#[\\w./-]+)?",

        // the input string must be consumed fully at this point to match
        "$"
      ].join("")
    );

    const match = url.match(protocolRex);
    if (match) {
      const { groups } = match;
      const branch = groups["branch"] || "";

      if (invalidBranch.test(branch)) {
        debug({
          in: url,
          error: "InvalidFormat (protocol)",
          hint: "branch is malformed"
        });
        throw new Error("Box specified with invalid format (git/https)");
      }

      const repo = groups["repo"].replace(/\.git$/i, "");
      const result = `https://${groups["service"]}:${groups["org"]}/${repo}${branch}`;
      debug({ in: url, out: result });
      return result;
    }

    debug({
      in: url,
      error: "InvalidFormat (protocol)",
      hint: "did not match protocol"
    });
    throw new Error("Box specified with invalid format (git/https)");
  }

  // default case: process [org/] + repo + [ #branch/name/with/slashes ]
  //
  const orgRepoBranchRex = new RegExp(
    [
      // start match at beginning
      "^",

      // org is 1 or many (word, dot or dash) followed by a slash. org can be
      // optional
      "(?<org>[\\w.-]+/)?",

      // repo is 1 or many (word, dot or dash)
      "(?<repo>[\\w.-]+)",

      // optional branch (undefined if unmatched)
      "(?<branch>#[\\w./-]+)?",

      "$"
    ].join("")
  );

  const match = url.match(orgRepoBranchRex);
  if (match) {
    const { groups } = match;

    // `truffle-box` is the default org
    const org = groups["org"] || "truffle-box/";
    const branch = groups["branch"] || "";

    if (invalidBranch.test(branch)) {
      debug({
        in: url,
        error: "InvalidFormat (orgRepoBranch)",
        hint: "branch is malformed"
      });
      throw new Error("Box specified with invalid format");
    }

    let repo = groups["repo"];

    // Official Truffle boxes should have a `-box` suffix
    if (org.toLowerCase().startsWith("truffle-box")) {
      repo = repo.endsWith("-box") ? repo : `${repo}-box`;
    }

    const result = `https://github.com:${org}${repo}${branch}`;

    debug({ in: url, out: result });
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
    const unpackBoxOptions = {
      logger: options.logger,
      force: options.force
    };

    try {
      const normalizedSourcePath = normalizeSourcePath(url);

      await Box.checkDir(options, destination);
      const tempDir = utils.setUpTempDirectory(events);
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
        const prompt: Question[] = [
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
    const { name, unsafeCleanup, setGracefulCleanup, logger, force } =
      parseSandboxOptions(options);

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
  }
};

export default Box;
