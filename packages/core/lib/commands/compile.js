const format = JSON.stringify;
const path = require("path");
const fse = require("fs-extra");

const command = {
  command: "compile",
  description: "Compile contract source files",
  builder: {
    all: {
      type: "boolean",
      default: false
    },
    compiler: {
      type: "string",
      default: null
    },
    list: {
      type: "string"
    },
    help: {
      type: "boolean",
      default: "false"
    }
  },
  help: {
    usage: "truffle compile [--list <filter>] [--all] [--quiet]",
    options: [
      {
        option: "--all",
        description:
          "Compile all contracts instead of only the contracts changed since last compile."
      },
      {
        option: "--list <filter>",
        description:
          "List all recent stable releases from solc-bin.  If filter is specified then it will display only " +
          "that\n                    type of release or docker tags. The filter parameter must be one of the following: " +
          "prereleases,\n                    releases, latestRelease or docker."
      },
      {
        option: "--quiet",
        description: "Suppress all compilation output."
      },
      {
        option: "--compiler <compiler-name>",
        description:
          "Specify a single compiler to use (e.g. `--compiler=solc`). Specify `none` to skip compilation."
      },
      {
        option: "--save-intermediate <output-file>",
        internal: true,
        description:
          "Save the raw compiler results into <output-file>, overwriting any existing content."
      }
    ],
    allowedGlobalOptions: ["config"]
  },
  run: async function (options) {
    const TruffleError = require("@truffle/error");
    const WorkflowCompile = require("@truffle/workflow-compile");
    const Config = require("@truffle/config");
    const config = Config.detect(options);

    if (config.list !== undefined) {
      return await command.listVersions(config);
    }

    if (
      options.saveIntermediate === true ||
      (typeof options.saveIntermediate === "string" &&
        options.saveIntermediate.trim() === "")
    ) {
      // user asked to save the intermediate compilation results
      // but didn't provide the file to save the results to
      throw new TruffleError(
        "You must provide a file to save compilation results to."
      );
    }

    const compilationOutput = await WorkflowCompile.compile(config);
    if (options.saveIntermediate) {
      // Get the filename the user provided to save the compilation results to
      const compilationOutputFile = path.resolve(options.saveIntermediate);

      await fse.writeFile(
        compilationOutputFile,
        JSON.stringify(compilationOutput),
        { encoding: "utf8" }
      );
    }

    const result = await WorkflowCompile.save(config, compilationOutput);
    if (config.db && config.db.enabled) {
      await WorkflowCompile.assignNames(config, result);
    }
    return result;
  },

  listVersions: async function (options) {
    const { CompilerSupplier } = require("@truffle/compile-solidity");
    const { asyncTake } = require("iter-tools");

    const supplier = new CompilerSupplier({
      solcConfig: {
        ...options.compilers.solc,
        docker: options.list === "docker"
      },
      events: options.events
    });

    const log = options.logger.log;
    options.list = options.list.length ? options.list : "releases";

    const {
      latestRelease,
      releases,
      prereleases
    } = await supplier.list();
    if (options.list === "latestRelease") {
      log(format(latestRelease, null, " "));
      return;
    }

    const allVersions = options.list === "prereleases" ? prereleases : releases;
    const versions = options.all ? allVersions : asyncTake(10, allVersions);

    if (options.all && options.list === "docker") {
      log(
        "Warning: using `--all` with `--list=docker` is very slow and makes " +
          "many HTTP requests."
      );
      log(
        "You may instead want to browse tags on the web here: " +
          "https://hub.docker.com/r/ethereum/solc/tags/"
      );
    }

    const tags = [];
    for await (const version of versions) {
      tags.push(version);
    }

    // Docker tags
    if (options.list === "docker" && !options.all) {
      tags.push("See more at: hub.docker.com/r/ethereum/solc/tags/");
    }

    log(format(tags, null, " "));
    return;
  },

  shortener: function (key, val) {
    const defaultLength = 10;

    if (Array.isArray(val) && val.length > defaultLength) {
      const length = val.length;
      const remaining = length - defaultLength;
      const more =
        ".. and " + remaining + " more. Use `--all` to see full list.";
      val.length = defaultLength;
      val.push(more);
    }

    return val;
  }
};

module.exports = command;
