var command = {
  command: 'develop',
  description: 'Open a console with a local TestRPC',
  builder: {
    log: {
      type: "boolean",
      default: false
    }
  },
  runConsole: function(config, testrpcOptions, done) {
    var Console = require("../console");
    var Environment = require("../environment");

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

    Environment.develop(config, testrpcOptions, function(err) {
      if (err) return done(err);

      var c = new Console(console_commands, config.with({
        noAliases: true
      }));

      c.start(done);
      c.on("exit", function() {
        process.exit();
      });
    });
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Develop = require("../develop");

    var config = Config.detect(options);

    var ipcOptions = {
      log: options.log
    };

    var testrpcOptions = {
      host: "localhost",
      port: 9545,
      network_id: 4447,
      seed: "yum chocolate",
      gasLimit: config.gas
    };

    Develop.connectOrStart(ipcOptions, testrpcOptions, function(started) {
      if (started) {
        config.logger.log("Truffle Develop started.");
        config.logger.log();
      } else {
        config.logger.log("Connected to exiting Truffle Develop session.");
        config.logger.log();
      }

      if (!options.log) {
        command.runConsole(config, testrpcOptions, done);
      }
    });
  }
}

module.exports = command;
