module.exports = async function (options) {
  const fs = require("fs");
  const util = require("util");
  const { Environment } = require("@truffle/environment");
  const OS = require("os");
  //const Web3 = require("web3");
  const Codec = require("@truffle/codec");
  const Encoder = require("@truffle/encoder");
  const Decoder = require("@truffle/decoder");
  const TruffleError = require("@truffle/error");
  const { fetchAndCompile } = require("@truffle/fetch-and-compile");
  //const reason = require("@truffle/contract/lib/reason");
  const loadConfig = require("../../loadConfig");

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

  let config = loadConfig(options);
  await Environment.detect(config);

  const [contractNameOrAddress, functionNameOrSignature, ...args] = config._;
  let functionEntry, transaction;

  const { encoder, decoder } = config.fetchExternal
    ? await sourceFromExternal(contractNameOrAddress, config)
    : await sourceFromLocal(contractNameOrAddress, config);

  ({ abi: functionEntry, tx: transaction } = await encoder.encodeTransaction(
    functionNameOrSignature,
    args
  ));

  if (functionEntry.stateMutability !== "view") {
    console.error("WARNING!!! The function called is not read-only");
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
      config.blockNumber
    ]
    //fields we don't allow overriding: to, data
  });

  // Error handling for 0 returned value
  // Handles cases for more than 1 returned values
  const [decoding] = await decoder.decodeReturnValue(functionEntry, result);
  //console.log("Decoding Result: ", decoding);

  // Use ReturndataDecodingInspector for logging
  config.logger.log(
    util.inspect(new Codec.Export.ReturndataDecodingInspector(decoding), {
      colors: true,
      depth: null,
      maxArrayLength: null,
      breakLength: 79
    })
  );

  // Alternative for ReturndataDecodingInspector, use ResultInspector for logging
  for (const { value: result } of decoding.arguments) {
    console.log(new Codec.Format.Utils.Inspect.ResultInspector(result), result);
  }

  async function sourceFromLocal(contractNameOrAddress, config) {
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
    if (isEmpty) {
      throw new Error(
        "No artifacts found! Please run `truffle compile` to compile your contracts"
      );
    }
    const settings = {
      provider: config.provider,
      projectInfo: {
        artifacts: Object.values(contracts)
      }
    };

    const contract = contracts[contractNameOrAddress];
    // Error handling to remind users to run truffle migrate first
    const instance = await contract.deployed();
    encoder = await Encoder.forContractInstance(instance, settings);
    decoder = await Decoder.forContractInstance(instance, settings);
    return { encoder, decoder };
  }

  async function sourceFromExternal(contractNameOrAddress, config) {
    const { compileResult } = await fetchAndCompile(
      contractNameOrAddress,
      config
    );

    const projectInfo = {
      commonCompilations: compileResult.compilations
    };

    const projectEncoder = await Encoder.forProject({
      provider: config.provider,
      projectInfo
    });
    const encoder = await projectEncoder.forAddress(contractNameOrAddress);

    const projectDecoder = await Decoder.forProject({
      provider: config.provider,
      projectInfo
    });

    const decoder = await projectDecoder.forAddress(contractNameOrAddress);
    return { encoder, decoder };
  }
};
