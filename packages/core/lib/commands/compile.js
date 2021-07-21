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
    usage: "truffle compile [<sources>..] [--list <filter>] [--all] [--quiet]",
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
      },
      {
        option: "sources",
        description:
          "List of files and its dependencies to be compiled. It will be ignored if --all flag is used."
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

    if (config._ && config._.length > 0) {
      // set paths based on command-line inputs, transforming to absolute
      // paths where appropriate
      config.paths = config._.map(specifiedPath => {
        // convert relative paths to absolute paths based on whether
        // the naive absolute path exists on disk
        //
        // NOTE in case of collision where the specified path refers to some
        // non-FS source (e.g. `truffle/Assert.sol`) and where that specified
        // path corresponds to an existing file relative to the working dir.,
        // this selects the latter as priority over the former.

        const absolutePath = path.resolve(
          config.working_directory,
          specifiedPath
        );

        // i.e., pass the absolutePath if it's a real file, otherwise just
        // pass whatever was specified.
        if (fse.existsSync(absolutePath)) {
          return absolutePath;
        } else {
          return specifiedPath;
        }
      });
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
    await WorkflowCompile.assignNames(config, result);
    return result;
  },

  listVersions: async function (options) {
    const { CompilerSupplier } = require("@truffle/compile-solidity");
    const supplier = new CompilerSupplier({
      solcConfig: options.compilers.solc,
      events: options.events
    });

    const log = options.logger.log;
    options.list = options.list.length ? options.list : "releases";

    // Docker tags
    if (options.list === "docker") {
      const tags = await supplier.getDockerTags();
      tags.push("See more at: hub.docker.com/r/ethereum/solc/tags/");
      log(format(tags, null, " "));
      return;
    }

    // Solcjs releases
    const releases = await supplier.getReleases();
    const shortener = options.all ? null : command.shortener;
    const list = format(releases[options.list], shortener, " ");
    log(list);
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
