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

  const fromAddress = config.from ?? config.networks[config.network]?.from;
  if (!web3Utils.isAddress(fromAddress)) {
    throw new TruffleError(
      `Address ${fromAddress} is not a valid Ethereum address.` +
        OS.EOL +
        "Please check the address and try again."
    );
  }

  const rawBlockNumber = config.blockNumber;
  const blockNumber = Number(rawBlockNumber);
  if (
    !(Number.isSafeInteger(blockNumber) && blockNumber >= 0) &&
    !["latest", "pending", "genesis", "earliest"].includes(rawBlockNumber)
  ) {
    throw new TruffleError(
      "Invalid block number.  Block number must be nonnegative integer or one of 'latest', 'pending', 'genesis', or 'earliest'."
    );
  }

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
  let result;
  let status = undefined;

  try {
    const result = await adapter.call(
      fromAddress,
      transaction.to,
      transaction.data,
      blockNumber
    );
    //note we don't set status to true... a revert need not cause an
    //error, depending on client
    if (typeof result !== "string") {
      //if we couldn't extract a return value, something's gone badly wrong;
      //let's just throw
      throw new Error("Malformed response from call");
    }
  } catch (error) {
    status = false;
    result = extractResult(error);
    if (result === undefined) {
      //if we couldn't extract a return value, something's gone badly wrong;
      //let's just rethrow the error in that case
      throw error;
    }
  }

  const [decoding] = await decoder.decodeReturnValue(functionEntry, result, {
    status
  });

  if (decoding.status) {
    //successful return
    config.logger.log(
      util.inspect(new Codec.Export.ReturndataDecodingInspector(decoding), {
        colors: true,
        depth: null,
        maxArrayLength: null,
        breakLength: 79
      })
    );
  } else {
    //revert case
    if (
      decoding.kind === "revert" &&
      Codec.AbiData.Utils.abiSignature(decoding.abi) === "Panic(uint256)"
    ) {
      // for panics specifically, we'll want a bit more interpretation
      // (shouldn't this be a proper interpretation? yes, but there's no
      // time to refactor that right now)
      const panicCode = decoding.arguments[0].value.value.asBN;
      throw new TruffleError(
        `The call resulted in a panic: ${DebugUtils.panicString(panicCode)}`
      );
    }
    //usual revert case
    throw new TruffleError(
      util.inspect(new Codec.Export.ReturndataDecodingInspector(decoding), {
        colors: false, //don't want colors in an error message
        depth: null,
        maxArrayLength: null,
        breakLength: 79
      })
    );
  }

  return;
  //Note: This is the end of the function.  After this point is just inner
  //function declarations.  These declarations are made as inner functions
  //so they can use the imports above.

  async function sourceFromLocal(contractNameOrAddress, config) {
    if (
      contractNameOrAddress.startsWith("0x") &&
      !web3Utils.isAddress(contractNameOrAddress)
    ) {
      throw new TruffleError(
        `Address ${contractNameOrAddress} is not a valid Ethereum address.` +
          OS.EOL +
          "Please check the address and try again."
      );
    }

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
      //note in this case we already performed validation above
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
      if (!contract) {
        throw new TruffleError(
          `No artitfacts found for contract named ${contractName} found.  Check the name and make sure you have compiled your contracts.`
        );
      }
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
          "Please check the address and try again, or remove `-x` if you are supplying a contract name."
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

function extractResult(error) {
  //CODE DUPLICATION WARNING!!
  //the following code is copied (w/slight adaptations) from contract/lib/reason.js
  //it should really be factored!!  but there may not be time to do that right now
  if (!error || !error.data) {
    return undefined;
  }

  // NOTE that Ganache >=2 returns the reason string when
  // vmErrorsOnRPCResponse === true, which this code could
  // be updated to respect (instead of computing here)
  const { data } = error;
  if (typeof data === "string") {
    return data; // geth, Ganache >7.0.0
  } else if ("result" in data) {
    // there is a single result (Ganache 7.0.0)
    return data.result;
  } else {
    // handle `evm_mine`, `miner_start`, batch payloads, and ganache 2.0
    // NOTE this only works for a single failed transaction at a time.
    const hash = Object.keys(data)[0];
    const errorDetails = data[hash];
    return errorDetails.return /* ganache 2.0 */;
  }
}
