const defaultNetworkIdForGanache = 5777;

function sanitizeGanacheOptions(ganacheOptions) {
  const network_id = ganacheOptions.network_id;

  // Use default network_id if "*" is defined in config
  if (network_id === "*") {
    return { ...ganacheOptions, network_id: defaultNetworkIdForGanache };
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

const ConfigureGanache = {
  getGanacheOptions: function (config, customConfig, mnemonic) {
    const ganacheOptions = {
      host: customConfig.host || "127.0.0.1", // Default host for managed ganache
      port: customConfig.port || 9545, // Default port for managed ganache
      network_id: customConfig.network_id || defaultNetworkIdForGanache,
      total_accounts:
        customConfig.accounts || customConfig.total_accounts || 10,
      default_balance_ether:
        customConfig.defaultEtherBalance ||
        customConfig.default_balance_ether ||
        100,
      blockTime: customConfig.blockTime || 0,
      fork: customConfig.fork,
      mnemonic: mnemonic,
      gasPrice: customConfig.gasPrice || 0x77359400,
      time: config.genesis_time,
      miner: {
        instamine: "strict"
      }
    };

    if (customConfig.hardfork !== null && customConfig.hardfork !== undefined) {
      ganacheOptions["hardfork"] = customConfig.hardfork;
    }

    const sanitizedGanacheOptions = sanitizeGanacheOptions(ganacheOptions);
    return sanitizedGanacheOptions;
  }
};

module.exports = ConfigureGanache;
