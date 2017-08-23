var command = {
  command: 'develop',
  description: 'Open a console with a local TestRPC',
  builder: {
    db: {
      type: "string",
      describe: "Path to save persistent chain data"
    }
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Console = require("../console");
    var Environment = require("../environment");

    var config = Config.detect(options);

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

    // use local environment instead of detecting config environment
    Environment.local(config, function(err, cleanup) {
      if (err) return done(err);

      config.logger.log("Truffle Develop started.");
      config.logger.log();

      var c = new Console(console_commands, config);
      c.start(function() { cleanup(done); });
    });

  }
}

module.exports = command;
