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

    // testrpc account info
    // HACK: accounts is hardcoded because it will not change for the mnemonic,
    // and not hardcoding it would require an HTTP request
    var mnemonic = "candy maple velvet cake sugar cream honey rich smooth crumble sweet treat";
    var accounts = [
      '0x47adc0faa4f6eb42b499187317949ed99e77ee85',
      '0x4ef9e4721bbf02b84d0e73822ee4e26e95076b9d',
      '0x4a5a6460d00c4d8c2835a3067f53fb42021d5bb9',
      '0x4222ec932c5a68b80e71f4ddebb069fa02518b8a',
      '0x2da061c6cfa5c23828e9d8dfbe295a22e8779712',
      '0xc1f061d629bbba139dbd07f2eb6a9252a45514c7',
      '0xf8e160be646d2429c64d46fba8e8588b8483dbaf',
      '0x74260eb42ffde3c442682c4fb6ceb3e801bbb79a',
      '0x76393ad6569272385963bc9a135356456bbe3f83',
      '0xae1708b0af10bf1fbee6b4b4220d9453f6007eeb'
    ];

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
        config.logger.log();

        config.logger.log(`Accounts:`);
        for (var i = 0; i < accounts.length; i++) {
          var account = accounts[i];
          config.logger.log(`(${i}) ${account}`);
        }
        config.logger.log();

        config.logger.log(`Mnemonic: ${mnemonic}`);
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
