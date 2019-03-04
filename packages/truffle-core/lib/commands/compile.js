const format = JSON.stringify;

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
    usage: "truffle compile [--list <filter>] [--all] [--network <name>]",
    options: [
      {
        option: "--all",
        description:
          "Compile all contracts instead of only the contracts changed since last compile."
      },
      {
        option: "--network <name>",
        description:
          "Specify the network to use, saving artifacts specific to that network. " +
          " Network name must exist in the\n                    configuration."
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
      }
    ]
  },
  run: function(options, done) {
    const CompilerSupplier = require("truffle-compile").CompilerSupplier;
    const supplier = new CompilerSupplier();

    const Contracts = require("truffle-workflow-compile");
    const Config = require("truffle-config");
    const config = Config.detect(options);

    config.list !== undefined
      ? command.listVersions(supplier, config, done)
      : Contracts.compile(config, done);
  },
  listVersions: function(supplier, options, done) {
    const log = options.logger.log;
    options.list = options.list.length ? options.list : "releases";

    // Docker tags
    if (options.list === "docker") {
      return supplier
        .getDockerTags()
        .then(tags => {
          tags.push("See more at: hub.docker.com/r/ethereum/solc/tags/");
          log(format(tags, null, " "));
          done();
        })
        .catch(done);
    }

    // Solcjs releases
    supplier
      .getReleases()
      .then(releases => {
        const shortener = options.all ? null : command.shortener;
        const list = format(releases[options.list], shortener, " ");
        log(list);
        done();
      })
      .catch(done);
  },

  shortener: function(key, val) {
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
