var command = {
  command: 'console',
  description: 'Run a console with contract abstractions and commands available',
  builder: {},
  run: function (options, done) {
    var Config = require("truffle-config");
    var Console = require("../repl");
    var Environment = require("../environment");
    var Develop = require("./develop");

    var config = Config.detect(options);

    if (!config.network || config.network == "development" && !config.networks.development) {
      Develop.run(options, done);
      return;
    }

    // This require a smell?
    var commands = require("./index")
    var excluded = [
      "console",
      "init",
      "watch",
      "serve",
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

      Console.run(console_commands, config.with({
        builder: config.build,
        processors: config.processors, // legacy option for default builder
      }), done);
    });
  }
}

module.exports = command;
