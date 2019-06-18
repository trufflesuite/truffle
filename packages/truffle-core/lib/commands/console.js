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
    const Environment = require("truffle-environment").environment;

    const config = Config.detect(options);

    // This require a smell?
    const commands = require("./index");
    const excluded = ["console", "init", "watch", "develop"];

    const available_commands = Object.keys(commands).filter(function(name) {
      return excluded.indexOf(name) === -1;
    });

    let console_commands = {};
    available_commands.forEach(function(name) {
      console_commands[name] = commands[name];
    });

    Environment.detect(config)
      .then(() => {
        const c = new Console(
          console_commands,
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
