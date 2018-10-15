var command = {
  command: 'console',
  description: 'Run a console with contract abstractions and commands available',
  builder: {},
  help: {
    usage: "truffle console [--network <name>] [--verbose-rpc]",
    options: [
      {
        option: "--network <name>",
        description: "Specify the network to use. Network name must exist in the configuration.",
      },{
        option: "--verbose-rpc",
        description: "Log communication between Truffle and the Ethereum client.",
      },
    ]
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Console = require("../console");
    var Environment = require("../environment");
    var Develop = require("./develop");
    var TruffleError = require("truffle-error");

    var config = Config.detect(options);

    if (!config.network && !config.networks.development) {
      return done(new TruffleError(
        "No network available. Use `truffle develop` " +
          "or add network to truffle.js config."
      ));
    }

    // This require a smell?
    var commands = require("./index")
    var excluded = [
      "console",
      "init",
      "watch",
      "develop"
    ];

    var available_commands = Object.keys(commands).filter(function(name) {
      return excluded.indexOf(name) == -1;
    });

    var console_commands = {};
    available_commands.forEach(function(name) {
      console_commands[name] = commands[name];
    });

    Environment.detect(config, function(err) {
      if (err) return done(err);

      var c = new Console(console_commands, config.with({
        noAliases: true
      }));
      c.start(done);
    });
  }
}

module.exports = command;
