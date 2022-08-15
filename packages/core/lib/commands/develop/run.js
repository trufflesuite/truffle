const emoji = require("node-emoji");
const mnemonicInfo = require("../../mnemonics/mnemonic");
const {
  configureManagedGanache,
  getFirstDefinedValue
} = require("../../configAdapter");

const runConsole = async (config, ganacheOptions) => {
  const { Console, excludedCommands } = require("../../console");
  const { Environment } = require("@truffle/environment");

  const commands = require("../commands");
  const allowedConsoleCommands = commands.filter(
    cmd => !excludedCommands.has(cmd)
  );

  await Environment.develop(config, ganacheOptions);
  const c = new Console(
    allowedConsoleCommands,
    config.with({ noAliases: true })
  );
  c.on("exit", () => process.exit());
  return await c.start();
};

module.exports = async options => {
  const { Develop } = require("@truffle/environment");
  const Config = require("@truffle/config");

  const config = Config.detect(options);
  const customConfig = config.networks.develop || {};

  const numberOfAccounts = getFirstDefinedValue(
    customConfig.accounts,
    customConfig.total_accounts,
    10 // Use as default number of accounts
  );
  const { mnemonic, accounts, privateKeys } =
    mnemonicInfo.getAccountsInfo(numberOfAccounts);

  const onMissing = () => "**";

  const warning =
    ":warning:  Important :warning:  : " +
    "This mnemonic was created for you by Truffle. It is not secure.\n" +
    "Ensure you do not use it on production blockchains, or else you risk losing funds.";

  const ipcOptions = {};

  if (options.log) {
    ipcOptions.log = options.log;
  }

  const ganacheOptions = configureManagedGanache(
    config,
    customConfig,
    mnemonic
  );

  const { started } = await Develop.connectOrStart(
    ipcOptions,
    ganacheOptions,
    config
  );
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

  if (options.log) {
    // leave the process open so that logging can take place
    return new Promise(() => {});
  }
  return await runConsole(config, ganacheOptions);
};
