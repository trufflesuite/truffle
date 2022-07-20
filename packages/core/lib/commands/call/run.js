module.exports = async function (options) {
  const fs = require("fs");
  const util = require("util");
  const Config = require("@truffle/config");
  const { Environment } = require("@truffle/environment");

  const Codec = require("@truffle/codec");
  const Encoder = require("@truffle/encoder");
  const Decoder = require("@truffle/decoder");

  const config = Config.detect(options);
  await Environment.detect(config);

  const [contractName, functionName, ...args] = config._;

  const contractNames = fs
    .readdirSync(config.contracts_build_directory)
    .filter(filename => filename.endsWith(".json"))
    .map(filename => filename.slice(0, -".json".length));
  const contracts = contractNames
    .map(contractName => ({
      [contractName]: config.resolver.require(contractName)
    }))
    .reduce((a, b) => ({ ...a, ...b }), {});

  const settings = {
    provider: config.provider,
    projectInfo: {
      artifacts: Object.values(contracts)
    }
  };

  const contract = contracts[contractName];
  const instance = await contract.deployed();

  const encoder = await Encoder.forContractInstance(instance, settings);

  const { abi: functionEntry, tx: transaction } =
    await encoder.encodeTransaction(functionName, args);

  // wrap provider for lazy EIP-1193 compatibility
  const provider = new Encoder.ProviderAdapter(config.provider);

  const result = await provider.request({
    method: "eth_call",
    params: [transaction]
  });

  const decoder = await Decoder.forContractInstance(instance, settings);

  const [decoding] = await decoder.decodeReturnValue(functionEntry, result);

  config.logger.log(
    util.inspect(new Codec.Export.ReturndataDecodingInspector(decoding), {
      colors: true,
      depth: null,
      maxArrayLength: null,
      breakLength: 79
    })
  );
};
