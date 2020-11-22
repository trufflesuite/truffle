const debug = require("debug")("lib:commands:db:commands:fetch:fetchBytecode");

const { createInterfaceAdapter } = require("@truffle/interface-adapter");

async function fetchBytecode(config, address) {
  const interfaceAdapter = createInterfaceAdapter({
    provider: config.provider,
    networkType: config.networks[config.network].type
  });

  return await interfaceAdapter.getCode(address);
}

module.exports = { fetchBytecode };
