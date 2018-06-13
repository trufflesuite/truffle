var emoji = require('node-emoji');

var command = {
  command: 'develop',
  description: 'Open a console with a local development blockchain',
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
    var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    var accounts = [
      '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      '0xf17f52151ebef6c7334fad080c5704d77216b732',
      '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
      '0x821aea9a577a9b44299b9c15c88cf3087f3b5544',
      '0x0d1d4e623d10f9fba5db95830f7d3839406c6af2',
      '0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e',
      '0x2191ef87e392377ec08e7c08eb105ef5448eced5',
      '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5',
      '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc',
      '0x5aeda56215b167893e80b4fe645ba6d5bab767de'
    ];

    var privateKeys = [
      'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
      'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
      '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1',
      'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c',
      '388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418',
      '659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63',
      '82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8',
      'aa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7',
      '0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4',
      '8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
    ];

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
