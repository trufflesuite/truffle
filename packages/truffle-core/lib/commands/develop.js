const emoji = require("node-emoji");
const mnemonicInfo = require("truffle-core/lib/mnemonics/mnemonic");
const util = require("util");

const command = {
  command: "develop",
  description: "Open a console with a local development blockchain",
  builder: {
    log: {
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle develop",
    options: []
  },
  async runConsole(config, ganacheOptions, done) {
    const Console = require("../console");
    const Environment = require("../environment");

    const commands = require("./index");
    const excluded = ["console", "develop", "unbox", "init"];

    const available_commands = Object.keys(commands).filter(
      name => !excluded.includes(name)
    );

    const console_commands = {};
    available_commands.forEach(name => {
      console_commands[name] = commands[name];
    });

    const environmentDevelop = util.promisify(Environment.develop);
    environmentDevelop(config, ganacheOptions).catch(err => done(err));

    const c = new Console(console_commands, config.with({ noAliases: true }));
    c.start(done);
    c.on("exit", async () => {
      process.exit();
    });
  },
  async run(options, done) {
    const Config = require("truffle-config");
    const Develop = require("../develop");

    const config = Config.detect(options);
    const customConfig = config.networks.develop || {};

    const { mnemonic, accounts, privateKeys } = mnemonicInfo.getAccountsInfo(
      customConfig.accounts || 10
    );

    const onMissing = name => "**";

    const warning =
      ":warning:  Important :warning:  : " +
      "This mnemonic was created for you by Truffle. It is not secure.\n" +
      "Ensure you do not use it on production blockchains, or else you risk losing funds.";

    const ipcOptions = {
      log: options.log
    };

    const ganacheOptions = {
      host: customConfig.host || "127.0.0.1",
      port: customConfig.port || 9545,
      network_id: customConfig.network_id || 4447,
      total_accounts: customConfig.accounts || 10,
      default_balance_ether: customConfig.defaultEtherBalance || 100,
      blockTime: customConfig.blockTime || 0,
      mnemonic,
      gasLimit: customConfig.gas || 0x6691b7,
      gasPrice: customConfig.gasPrice || 0x77359400,
      noVMErrorsOnRPCResponse: true
    };

    Develop.connectOrStart(ipcOptions, ganacheOptions, started => {
      const url = `http://${ganacheOptions.host}:${ganacheOptions.port}/`;

      if (started) {
        config.logger.log(`Truffle Develop started at ${url}`);
        config.logger.log();

        config.logger.log(`Accounts:`);
        accounts.forEach((acct, idx) => config.logger.log(`(${idx}) ${acct}`));
        config.logger.log();

        config.logger.log(`Private Keys:`);
        privateKeys.forEach((key, idx) => config.logger.log(`(${idx}) ${key}`));
        config.logger.log();

        config.logger.log(`Mnemonic: ${mnemonic}`);
        config.logger.log();
        config.logger.log(emoji.emojify(warning, onMissing));
        config.logger.log();
      } else {
        config.logger.log(
          `Connected to existing Truffle Develop session at ${url}`
        );
        config.logger.log();
      }

      if (!options.log) {
        command.runConsole(config, ganacheOptions, done);
      }
    });
  }
};

module.exports = command;
