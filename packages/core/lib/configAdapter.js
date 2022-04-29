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

// This function returns the first defined argument value and throws if all arguments are undefined
const getFirstDefinedValue = (...values) => {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  throw new Error("No values supplied");
};

function configureManagedGanache(config, networkConfig, mnemonic) {
  const host = getFirstDefinedValue(
    networkConfig.host,
    "127.0.0.1" // Use as default host
  );

  const port = getFirstDefinedValue(
    networkConfig.port,
    9545 // Use as default port
  );

  const network_id = getFirstDefinedValue(
    networkConfig.network_id,
    Date.now() // Use current time as default
  );

  const total_accounts = getFirstDefinedValue(
    networkConfig.accounts,
    networkConfig.total_accounts,
    10 // Use as default number of accounts
  );

  const default_balance_ether = getFirstDefinedValue(
    networkConfig.defaultEtherBalance,
    networkConfig.default_balance_ether,
    100 // Use as default ether balance for each account
  );

  const blockTime = getFirstDefinedValue(
    networkConfig.blockTime,
    0 // Use as default block time
  );

  const gasLimit = getFirstDefinedValue(
    networkConfig.gasLimit,
    0x6691b7 // Use as default gasLimit
  );

  const gasPrice = getFirstDefinedValue(
    networkConfig.gasPrice,
    0x77359400 // Use default gas price 2000000000 wei
  );

  const genesisTime = getFirstDefinedValue(
    networkConfig.time,
    networkConfig.genesis_time,
    Date.now() // Use current time as default
  );

  const ganacheOptions = {
    host,
    port,
    network_id,
    total_accounts,
    default_balance_ether,
    blockTime,
    fork: networkConfig.fork,
    mnemonic,
    gasLimit,
    gasPrice,
    time: genesisTime,
    miner: {
      instamine: "strict"
    }
  };

  // Set hardfork if defined, otherwise rely on Ganache's default which will always be correct
  if (networkConfig.hardfork != null) {
    ganacheOptions["hardfork"] = networkConfig.hardfork;
  }

  const sanitizedGanacheOptions = sanitizeGanacheOptions(ganacheOptions);
  return sanitizedGanacheOptions;
}

module.exports = { configureManagedGanache, getFirstDefinedValue };
