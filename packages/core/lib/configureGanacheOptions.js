function sanitizeGanacheOptions(ganacheOptions) {
  const network_id = ganacheOptions.network_id;

  // Use default network_id if "*" is defined in config
  if (network_id === "*") {
    return { ...ganacheOptions, network_id: Date.now() };
  }

  const parsedNetworkId = parseInt(network_id, 10);
  if (isNaN(parsedNetworkId)) {
    const error =
      `The network id specified in the truffle config ` +
      `(${network_id}) is not valid. Please properly configure the network id as an integer value.`;
    throw new Error(error);
  }
  return { ...ganacheOptions, network_id: parsedNetworkId };
}

function configureManagedGanache(config, networkConfig, mnemonic) {
  const calcTotalAccounts = networkConfig => {
    // Respect user's number of accounts choice to 0 in truffle config
    const isZeroAccount =
      networkConfig.accounts === 0 || networkConfig.total_accounts === 0;
    const userAccounts = networkConfig.accounts || networkConfig.total_accounts;
    return isZeroAccount ? 0 : userAccounts || 10;
  };

  const calcTotalEtherBalance = networkConfig => {
    // Respect user's accounts ether balance choice to 0 in truffle config
    const isZeroEtherBalance =
      networkConfig.defaultEtherBalance === 0 ||
      networkConfig.default_balance_ether === 0;
    const userAccountsEtherBalance =
      networkConfig.defaultEtherBalance || networkConfig.default_balance_ether;
    return isZeroEtherBalance ? 0 : userAccountsEtherBalance || 100;
  };

  const calcGasPrice = networkConfig => {
    return networkConfig.gasPrice === 0
      ? 0
      : networkConfig.gasPrice || 0x77359400;
  };

  const ganacheOptions = {
    host: networkConfig.host || "127.0.0.1", // Default host for managed ganache
    port: networkConfig.port || 9545, // Default port for managed ganache
    network_id: networkConfig.network_id || Date.now(),
    total_accounts: calcTotalAccounts(networkConfig),
    default_balance_ether: calcTotalEtherBalance(networkConfig),
    blockTime: networkConfig.blockTime || 0,
    fork: networkConfig.fork,
    mnemonic: mnemonic,
    gasLimit: networkConfig.gasLimit || 0x6691b7,
    gasPrice: calcGasPrice(networkConfig),
    // config.genesis_time is for compatibility with older versions
    time:
      networkConfig.genesis_time || networkConfig.time || config.genesis_time,
    miner: {
      instamine: "strict"
    }
  };

  if (networkConfig.hardfork !== null && networkConfig.hardfork !== undefined) {
    ganacheOptions["hardfork"] = networkConfig.hardfork;
  }

  const sanitizedGanacheOptions = sanitizeGanacheOptions(ganacheOptions);
  return sanitizedGanacheOptions;
}

module.exports = { configureManagedGanache };
