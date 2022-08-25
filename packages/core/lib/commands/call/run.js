module.exports = async function (options) {
  const fs = require("fs");
  const util = require("util");
  const Config = require("@truffle/config");
  const { Environment } = require("@truffle/environment");
  const OS = require("os");
  const Codec = require("@truffle/codec");
  const Encoder = require("@truffle/encoder");
  const Decoder = require("@truffle/decoder");
  const TruffleError = require("@truffle/error");

  if (options.url && options.network) {
    const message =
      "" +
      "Mutually exclusive options, --url and --network detected!" +
      OS.EOL +
      "Please use either --url or --network and try again." +
      OS.EOL +
      "See: https://trufflesuite.com/docs/truffle/reference/truffle-commands/#call" +
      OS.EOL;
    throw new TruffleError(message);
  }

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

  const isEmpty = Object.keys(contracts).length === 0;
  let settings;
  if (isEmpty) {
    throw new Error(
      "No artifacts found! Please run `truffle compile` to compile your contracts"
    );
  } else {
    settings = {
      provider: config.provider,
      projectInfo: {
        artifacts: Object.values(contracts)
      }
    };
  }

  const contract = contracts[contractName];

  // Error handling to remind users to run truffle migrate first
  const instance = await contract.deployed();

  const encoder = await Encoder.forContractInstance(instance, settings);

  const { abi: functionEntry, tx: transaction } =
    await encoder.encodeTransaction(functionName, args);

  if (functionEntry.stateMutability !== "view") {
    console.log("WARNING !!! The function called is not read-only");
  }

  // wrap provider for lazy EIP-1193 compatibility
  // replace the legacy provider API with EIP-1193?
  const provider = new Encoder.ProviderAdapter(config.provider);

  const result = await provider.request({
    method: "eth_call",
    params: [
      {
        from: options.from,
        to: transaction.to,
        data: transaction.data
      },
      options.blockNumber
    ]
    //fields we don't allow overriding: to, data
  });

  const decoder = await Decoder.forContractInstance(instance, settings);

  // Error handling for 0 returned value
  // Handles cases for more than 1 returned values
  const [decoding] = await decoder.decodeReturnValue(functionEntry, result);

  // Use ResultInspector instead of ReturndataDecodingInspector
  config.logger.log(
    util.inspect(new Codec.Export.ReturndataDecodingInspector(decoding), {
      colors: true,
      depth: null,
      maxArrayLength: null,
      breakLength: 79
    })
  );
};
