const emoji = require("node-emoji");
const mnemonicInfo = require("../../mnemonics/mnemonic");

const runConsole = async (config, ganacheOptions) => {
  const Console = require("../../console");
  const { Environment } = require("@truffle/environment");

  const commands = require("../index");
  const excluded = new Set(["console", "develop", "unbox", "init"]);

  const consoleCommands = Object.keys(commands).reduce((acc, name) => {
    return !excluded.has(name)
      ? Object.assign(acc, {[name]: commands[name]})
      : acc;
  }, {});

  await Environment.develop(config, ganacheOptions);
  const c = new Console(consoleCommands, config.with({noAliases: true}));
  c.on("exit", () => process.exit());
  return await c.start();
};

module.exports = async options => {
  const { Develop } = require("@truffle/environment");
  const Config = require("@truffle/config");

  const config = Config.detect(options);
  const customConfig = config.networks.develop || {};

  const { mnemonic, accounts, privateKeys } = mnemonicInfo.getAccountsInfo(
    customConfig.accounts || 10
  );

  const onMissing = () => "**";

  const warning =
    ":warning:  Important :warning:  : " +
    "This mnemonic was created for you by Truffle. It is not secure.\n" +
    "Ensure you do not use it on production blockchains, or else you risk losing funds.";

  const ipcOptions = { log: options.log };

  const ganacheOptions = {
    host: customConfig.host || "127.0.0.1",
    port: customConfig.port || 9545,
    network_id: customConfig.network_id || 5777,
    total_accounts: customConfig.accounts || 10,
    default_balance_ether: customConfig.defaultEtherBalance || 100,
    blockTime: customConfig.blockTime || 0,
    fork: customConfig.fork,
    mnemonic,
    gasLimit: customConfig.gas || 0x6691b7,
    gasPrice: customConfig.gasPrice || 0x77359400,
    time: config.genesis_time,
    _chainId: 1337 //temporary until Ganache v3!
  };

  if (customConfig.hardfork !== null && customConfig.hardfork !== undefined) {
    ganacheOptions["hardfork"] = customConfig.hardfork;
  }

  function sanitizeNetworkID(network_id) {
    if (network_id !== "*") {
      if (!parseInt(network_id, 10)) {
        const error =
          `The network id specified in the truffle config ` +
          `(${network_id}) is not valid. Please properly configure the network id as an integer value.`;
        throw new Error(error);
      }
      return network_id;
    } else {
      // We have a "*" network. Return the default.
      return 5777;
    }
  }

  ganacheOptions.network_id = sanitizeNetworkID(ganacheOptions.network_id);

  const { started } = await Develop.connectOrStart(ipcOptions, ganacheOptions);
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
