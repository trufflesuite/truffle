var command = {
  command: 'console',
  description: 'Run a console with contract abstractions and commands available',
  builder: {},
  run: function (options, done) {
    var Config = require("truffle-config");
    var Console = require("../repl");
    var Environment = require("../environment");

    var config = Config.detect(options);

    // This require a smell?
    var commands = require("./index")

    var available_commands = Object.keys(commands).filter(function(name) {
      return name != "console" && name != "init" && name != "watch" && name != "serve";
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
