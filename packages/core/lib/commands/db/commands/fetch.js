const debug = require("debug")("lib:commands:db:commands:fetch");

const command = {
  command: "fetch",
  description: "Fetch verified contracts and save to @truffle/db",
  builder: {
    _: {
      type: "string"
    }
  },
  help: {
    usage: "truffle db fetch [--network <name>] <address>",
    options: [
      {
        option: "--network <name>",
        description:
          "Specify the network to use, fetching verified contracts on that network. " +
          "Network name must exist\n                    in the configuration."
      }
    ]
  },

  run: async function (argv) {
    const OS = require("os");
    const Config = require("@truffle/config");
    const { Environment } = require("@truffle/environment");
    const TruffleError = require("@truffle/error");
    const { connect, Project } = require("@truffle/db");
    const DbKit = require("@truffle/db-kit");

    const config = Config.detect(argv);
    if (!config.db || !config.db.enabled) {
      throw new TruffleError(
        `This command requires @truffle/db. Please add { db: { enabled: true } } to${OS.EOL}` +
          `your truffle-config.js.`
      );
    }

    const [, address] = config._;
    if (!address) {
      throw new TruffleError(
        "No address specified. Please specify `truffle db fetch <address>`"
      );
    }

    await Environment.detect(config);

    const project = (await Project.initialize({
      db: connect(config.db),
      project: {
        directory: config.working_directory
      }
    })).connect({ provider: config.provider });

    await DbKit.Utils.fetchExternal({ config, project, address});
  }
};

module.exports = command;
