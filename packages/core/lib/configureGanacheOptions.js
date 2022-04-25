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
  const ganacheOptions = {
    host: networkConfig.host || "127.0.0.1", // Default host for managed ganache
    port: networkConfig.port || 9545, // Default port for managed ganache
    network_id: networkConfig.network_id || Date.now(),
    total_accounts:
      networkConfig.accounts || networkConfig.total_accounts || 10,
    default_balance_ether:
      networkConfig.defaultEtherBalance ||
      networkConfig.default_balance_ether ||
      100,
    blockTime: networkConfig.blockTime || 0,
    fork: networkConfig.fork,
    mnemonic: mnemonic,
    gasLimit: networkConfig.gasLimit || 0x6691b7,
    gasPrice: networkConfig.gasPrice || 0x77359400,
    // config.genesis_time is for compatibility with older versions
    time:
      networkConfig.genesis_time || networkConfig.time || config.genesis_time,
    miner: {
      instamine: "strict"
    }
  };

  if (networkConfig.accounts === 0 || networkConfig.total_accounts === 0) {
    ganacheOptions.total_accounts = 0;
  }

  if (
    networkConfig.defaultEtherBalance === 0 ||
    networkConfig.default_balance_ether === 0
  ) {
    ganacheOptions.default_balance_ether = 0;
  }

  if (networkConfig.gasPrice === 0) {
    ganacheOptions.gasPrice = 0;
  }

  if (networkConfig.hardfork !== null && networkConfig.hardfork !== undefined) {
    ganacheOptions["hardfork"] = networkConfig.hardfork;
  }

  const sanitizedGanacheOptions = sanitizeGanacheOptions(ganacheOptions);
  return sanitizedGanacheOptions;
}

module.exports = { configureManagedGanache };
