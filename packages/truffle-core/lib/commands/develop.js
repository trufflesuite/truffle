var emoji = require('node-emoji');
const mnemonicInfo = require('truffle-core/lib/mnemonics/mnemonic');

var command = {
  command: 'develop',
  description: 'Open a console with a local development blockchain',
  builder: {
    log: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle develop",
    options: [],
  },
  runConsole: function(config, testrpcOptions, done) {
    var Console = require("../console");
    var Environment = require("../environment");

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

    const { mnemonic, accounts, privateKeys } = mnemonicInfo.getAccountsInfo();


    var onMissing = function(name){ return "**"};

    var warning =
      ":warning:  Important :warning:  : " +
      "This mnemonic was created for you by Truffle. It is not secure.\n" +
      "Ensure you do not use it on production blockchains, or else you risk losing funds.";

    var ipcOptions = {
      log: options.log
    };

    var testrpcOptions = {
      host: "127.0.0.1",
      port: 9545,
      network_id: 4447,
      mnemonic: mnemonic,
      gasLimit: config.gas,
      noVMErrorsOnRPCResponse: true,
    };

    Develop.connectOrStart(ipcOptions, testrpcOptions, function(started) {
      var url = `http://${testrpcOptions.host}:${testrpcOptions.port}/`;

      if (started) {
        config.logger.log(`Truffle Develop started at ${url}`);
        config.logger.log();

        config.logger.log(`Accounts:`);
        for (var i = 0; i < accounts.length; i++) {
          var account = accounts[i];
          config.logger.log(`(${i}) ${account}`);
        }
        config.logger.log();

        config.logger.log(`Private Keys:`);
        for (var i = 0; i < privateKeys.length; i++) {
          var privateKey = privateKeys[i];
          config.logger.log(`(${i}) ${privateKey}`);
        }
        config.logger.log();

        config.logger.log(`Mnemonic: ${mnemonic}`);
        config.logger.log();
        config.logger.log(emoji.emojify(warning, onMissing));
        config.logger.log();
      } else {
        config.logger.log(`Connected to existing Truffle Develop session at ${url}`);
        config.logger.log();
      }

      if (!options.log) {
        command.runConsole(config, testrpcOptions, done);
      }
    });
  }
}

module.exports = command;
