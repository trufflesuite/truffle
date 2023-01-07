module.exports = async function (options) {
  const fs = require("fs");
  const util = require("util");
  const { Environment } = require("@truffle/environment");
  const OS = require("os");
  const Codec = require("@truffle/codec");
  const Encoder = require("@truffle/encoder");
  const Decoder = require("@truffle/decoder");
  const TruffleError = require("@truffle/error");
  const { fetchAndCompile } = require("@truffle/fetch-and-compile");
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
    console.log(
      `WARNING!!! Not a view function\n` +
        `Any changes this function attempts to make will not be saved\n` +
        `ABI stateMutability: ${functionEntry.stateMutability}\n`
    );
  }

  const provider = new Encoder.ProviderAdapter(config.provider);
  let result;
  try {
    result = await provider.request({
      method: "eth_call",
      params: [
        {
          from: config.from,
          to: transaction.to,
          data: transaction.data
        },
        config.blockNumber
      ]
    });
  } catch (error) {
    console.log(`Error Message: ${error.message}\nError Code: ${error.code}`);
  }

  if (result !== null && result !== undefined) {
    const [decoding] = await decoder.decodeReturnValue(functionEntry, result);

    for (const { value: result } of decoding.arguments) {
      console.log(
        util.inspect(new Codec.Export.ResultInspector(result), {
          colors: true,
          depth: null,
          maxArrayLength: null,
          breakLength: 79
        })
      );
    }
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
      throw new TruffleError(
        "No artifacts found! Please run `truffle compile` first to compile your contracts!"
      );
    }

    if (contractNameOrAddress.startsWith("0x")) {
      // contract address case
      const contractAddress = contractNameOrAddress;
      const projectInfo = {
        artifacts: Object.values(contracts)
      };

      return await getEncoderDecoderForContractAddress(
        contractAddress,
        projectInfo
      );
    } else {
      // contract name case
      const contractName = contractNameOrAddress;
      const settings = {
        provider: config.provider,
        projectInfo: {
          artifacts: Object.values(contracts)
        }
      };

      const contract = contracts[contractName];
      // Error handling to remind users to run truffle migrate first
      let instance;
      try {
        instance = await contract.deployed();
      } catch (error) {
        throw new TruffleError(
          "This contract has not been deployed to the detected network.\n" +
            "Please run `truffle migrate` to deploy the contract!"
        );
      }
      const encoder = await Encoder.forContractInstance(instance, settings);
      const decoder = await Decoder.forContractInstance(instance, settings);
      return { encoder, decoder };
    }
  }

  async function sourceFromExternal(contractAddress, config) {
    const { compileResult } = await fetchAndCompile(contractAddress, config);

    const projectInfo = {
      commonCompilations: compileResult.compilations
    };

    return await getEncoderDecoderForContractAddress(
      contractAddress,
      projectInfo
    );
  }

  async function getEncoderDecoderForContractAddress(
    contractAddress,
    projectInfo
  ) {
    const projectEncoder = await Encoder.forProject({
      provider: config.provider,
      projectInfo
    });
    const encoder = await projectEncoder.forAddress(
      contractAddress,
      config.blockNumber
    );

    const projectDecoder = await Decoder.forProject({
      provider: config.provider,
      projectInfo
    });
    const decoder = await projectDecoder.forAddress(
      contractAddress,
      config.blockNumber
    );

    return { encoder, decoder };
  }
};
