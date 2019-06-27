const command = {
  command: "console",
  description:
    "Run a console with contract abstractions and commands available",
  builder: {},
  help: {
    usage: "truffle console [--network <name>] [--verbose-rpc]",
    options: [
      {
        option: "--network <name>",
        description:
          "Specify the network to use. Network name must exist in the configuration."
      },
      {
        option: "--verbose-rpc",
        description:
          "Log communication between Truffle and the Ethereum client."
      }
    ]
  },
  run: function(options, done) {
    const Config = require("truffle-config");
    const Console = require("../console");
    const { Environment } = require("truffle-environment");

    const config = Config.detect(options);

    // This require a smell?
    const commands = require("./index");
    const excluded = ["console", "init", "watch", "develop"];

    const availableCommands = Object.keys(commands).filter(name => {
      return excluded.indexOf(name) === -1;
    });

    const consoleCommands = {};
    availableCommands.forEach(name => {
      consoleCommands[name] = commands[name];
    });

    Environment.detect(config)
      .then(() => {
        const c = new Console(
          consoleCommands,
          config.with({ noAliases: true })
        );
        c.start(done);
      })
      .catch(error => {
        done(error);
      });
  }
};

module.exports = command;
