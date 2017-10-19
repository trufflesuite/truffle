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
    var mnemonic = "candy maple velvet cake sugar cream honey rich smooth crumble sweet treat";

    var config = Config.detect(options);

    var ipcOptions = {
      log: options.log
    };

    var testrpcOptions = {
      host: "localhost",
      port: 9545,
      network_id: 4447,
      mnemonic: mnemonic,
      gasLimit: config.gas
    };

    Develop.connectOrStart(ipcOptions, testrpcOptions, function(started) {
      var url = `http://${testrpcOptions.host}:${testrpcOptions.port}/`;

      if (started) {
        config.logger.log(`Truffle Develop started at ${url}`);
        config.logger.log(`Mnemonic: ${mnemonic}`);
        config.logger.log();
      } else {
        config.logger.log(`Connected to existing Truffle Develop session at ${url}`);
        config.logger.log(`Mnemonic: ${mnemonic}`);
        config.logger.log();
      }

      if (!options.log) {
        command.runConsole(config, testrpcOptions, done);
      }
    });
  }
}

module.exports = command;
