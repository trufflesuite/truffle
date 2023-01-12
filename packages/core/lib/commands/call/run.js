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
  const web3EthAbi = require("web3-eth-abi");
  const DebugUtils = require("@truffle/debug-utils");

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
    result = await provider.call(
      config.from,
      transaction.to,
      transaction.data,
      config.blockNumber
    );
  } catch (error) {
    const reasonString = decodeRawData(error.data);
    throw new TruffleError(
      `The call returned an error: ${reasonString}\n` +
        `Error code: ${error.code}`
    );
  }

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

  // Decodes raw data from the eth_call error response and returns the reason string
  function decodeRawData(rawData) {
    const errorStringHash = "0x08c379a0";
    const panicCodeHash = "0x4e487b71";
    const selectorLength = 2 + 2 * 4; //0x then 4 bytes (0x then 8 hex digits)
    const wordLength = 2 * 32; //32 bytes (64 hex digits)
    if (!rawData) {
      return undefined;
    } else if (rawData === "0x") {
      //no revert message
      return undefined;
    } else if (rawData.startsWith(errorStringHash)) {
      try {
        return web3EthAbi.decodeParameter(
          "string",
          rawData.slice(selectorLength)
        );
      } catch (_) {
        //no reasonable way to handle this case at present
        return undefined;
      }
    } else if (rawData.startsWith(panicCodeHash)) {
      if (rawData.length === selectorLength + wordLength) {
        const panicCode = web3EthAbi.decodeParameter(
          "uint256",
          rawData.slice(selectorLength)
        ); //this returns a decimal string
        return `Panic: ${DebugUtils.panicString(panicCode)}`;
      } else {
        //incorrectly encoded panic...?
        return undefined;
      }
    } else {
      //we can't reasonably handle custom errors here
      //(but we can probably assume it is one?)
      return "Custom error (could not decode)";
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
