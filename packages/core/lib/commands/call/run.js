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
  const DebugUtils = require("@truffle/debug-utils");
  const web3Utils = require("web3-utils");

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

  const { blockNumber } = config;

  const { encoder, decoder } = config.fetchExternal
    ? await sourceFromExternal(contractNameOrAddress, config)
    : await sourceFromLocal(contractNameOrAddress, config);

  try {
    ({ abi: functionEntry, tx: transaction } = await encoder.encodeTransaction(
      functionNameOrSignature,
      args,
      {
        allowJson: true,
        strictBooleans: true
      }
    ));
  } catch (error) {
    throw new TruffleError(
      "The function name, function signature or function arguments you entered are invalid!\n" +
        "Please run the command again with valid function name, function signature and function arguments (if any)!"
    );
  }

  if (!["pure", "view"].includes(functionEntry.stateMutability)) {
    console.log(
      "WARNING: Making read-only call to non-view function." +
        OS.EOL +
        "Any changes this function attempts to make will not be saved to the blockchain."
    );
  }

  const adapter = new Encoder.ProviderAdapter(config.provider);
  let decoding;

  // Get the first defined "from" address
  const fromAddress =
    options.from ?? config.networks[config.network]?.from ?? config.from;
  if (!web3Utils.isAddress(fromAddress)) {
    throw new TruffleError(
      `Address ${fromAddress} is not a valid Ethereum address.` +
        OS.EOL +
        "Please check the address and try again."
    );
  }

  try {
    const result = await adapter.call(
      fromAddress,
      transaction.to,
      transaction.data,
      blockNumber
    );

    [decoding] = await decoder.decodeReturnValue(functionEntry, result, {
      status: true
    });
  } catch (error) {
    [decoding] = await decoder.decodeReturnValue(functionEntry, error.data, {
      status: false
    });

    // Gives a readable interpretation of the panic code returned from the call
    if (decoding.abi.name === "Panic") {
      const panicCode = decoding.arguments[0].value.value.asBN;
      throw new TruffleError(
        `Error thrown: Panic: ${DebugUtils.panicString(panicCode)}`
      );
    }
  }

  config.logger.log(
    util.inspect(new Codec.Export.ReturndataDecodingInspector(decoding), {
      colors: true,
      depth: null,
      maxArrayLength: null,
      breakLength: 79
    })
  );

  return;
  //Note: This is the end of the function.  After this point is just inner
  //function declarations.  These declarations are made as inner functions
  //so they can use the imports above.

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

    if (Object.keys(contracts).length === 0) {
      throw new TruffleError(
        "No artifacts found; please run `truffle compile` first to compile your contracts."
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
          "This contract has not been deployed to the detected network." +
            OS.EOL +
            "Please run `truffle migrate` to deploy the contract."
        );
      }
      const encoder = await Encoder.forContractInstance(instance, settings);
      const decoder = await Decoder.forContractInstance(instance, settings);
      return { encoder, decoder };
    }
  }

  async function sourceFromExternal(contractAddress, config) {
    if (!web3Utils.isAddress(contractAddress)) {
      throw new TruffleError(
        `Address ${contractAddress} is not a valid Ethereum address.` +
          OS.EOL +
          "Please check the address and try again."
      );
    }

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
      blockNumber
    );

    const projectDecoder = await Decoder.forProject({
      provider: config.provider,
      projectInfo
    });
    const decoder = await projectDecoder.forAddress(
      contractAddress,
      blockNumber
    );

    return { encoder, decoder };
  }
};
