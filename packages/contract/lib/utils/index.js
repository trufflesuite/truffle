const debug = require("debug")("contract:utils");
const web3Utils = require("web3-utils");
const { bigNumberify } = require("ethers/utils/bignumber");
const abi = require("web3-eth-abi");
const BlockchainUtils = require("@truffle/blockchain-utils");
const reformat = require("../reformat");
const ens = require("./ens");

const allowedTxParams = new Set([
  "from",
  "to",
  "gas",
  "gasPrice",
  "maxFeePerGas",
  "maxPriorityFeePerGas",
  "value",
  "data",
  "nonce",
  "accessList",
  "type",
  "privateFor",
  "overwrite"
]);

const Utils = {
  is_object(val) {
    return typeof val === "object" && !Array.isArray(val);
  },

  is_big_number(val) {
    if (typeof val !== "object") return false;

    //NOTE: For some reason, contrary to the docs,
    //web3Utils.isBigNumber returns true not only for
    //bignumber.js BigNumbers, but also for ethers BigNumbers,
    //even though these are totally different things.
    return web3Utils.isBN(val) || web3Utils.isBigNumber(val);
  },

  isTxParams(val) {
    if (!Utils.is_object(val)) return false;
    if (Utils.is_big_number(val)) return false;
    return Object.keys(val).some(fieldName => allowedTxParams.has(fieldName));
  },

  decodeLogs(_logs, isSingle) {
    const constructor = this;
    const logs = Utils.toTruffleLog(_logs, isSingle);

    return logs
      .map(log => {
        const logABI = constructor.events[log.topics[0]];

        if (logABI == null) return null;

        const copy = Utils.merge({}, log);

        copy.event = logABI.name;
        copy.topics = logABI.anonymous ? copy.topics : copy.topics.slice(1);

        if (copy.data === "0x") copy.data = "";

        let logArgs;
        try {
          logArgs = abi.decodeLog(logABI.inputs, copy.data, copy.topics);
          copy.args = reformat.numbers.call(
            constructor,
            logArgs,
            logABI.inputs
          );
        } catch (_) {
          return null;
        }

        delete copy.data;
        delete copy.topics;

        return copy;
      })
      .filter(log => log != null);
  },

  toTruffleLog(events, isSingle) {
    // Transform singletons (from event listeners) to the kind of
    // object we find on the receipt
    if (isSingle && typeof isSingle === "boolean") {
      const temp = [];
      temp.push(events);
      return temp.map(log => {
        log.data = log.raw.data;
        log.topics = log.raw.topics;
        return log;
      });
    }

    // Or reformat items in the existing array
    events.forEach(event => {
      if (event.raw) {
        event.data = event.raw.data;
        event.topics = event.raw.topics;
      }
    });

    return events;
  },

  merge() {
    const merged = {};
    const args = Array.prototype.slice.call(arguments);

    for (let i = 0; i < args.length; i++) {
      const object = args[i];
      const keys = Object.keys(object);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const value = object[key];
        merged[key] = value;
      }
    }

    return merged;
  },

  linkBytecode(bytecode, links) {
    Object.keys(links).forEach(library_name => {
      const library_address = links[library_name];
      const regex = new RegExp(`__${library_name}_+`, "g");

      bytecode = bytecode.replace(regex, library_address.replace("0x", ""));
    });

    return bytecode;
  },

  // Extracts optional tx params from a list of fn arguments
  getTxParams(methodABI, args, ignoreDefaultGasPriceParams = false) {
    const constructor = this;

    const expectedArgCount = methodABI ? methodABI.inputs.length : 0;

    let txParams = {};
    const lastArg = args[args.length - 1];

    if (args.length === expectedArgCount + 1 && Utils.isTxParams(lastArg)) {
      txParams = args.pop();
    }

    let defaultParams = constructor.class_defaults;
    if (ignoreDefaultGasPriceParams) {
      //this parameter is set when making calls (as opposed to transactions)
      //gas price params can cause problems with those on some networks, so
      //we ignore any defaults, and only include them if they were explicitly
      //specified
      defaultParams = { ...constructor.class_defaults }; //clone
      delete defaultParams.gasPrice;
      delete defaultParams.maxFeePerGas;
      delete defaultParams.maxPriorityFeePerGas;
    }

    return Utils.merge(defaultParams, txParams);
  },

  // Verifies that a contracts libraries have been linked correctly.
  // Throws on error
  checkLibraries() {
    const constructor = this;
    const regex = /__[^_]+_+/g;
    let unlinkedLibraries = constructor.binary.match(regex);

    if (unlinkedLibraries !== null) {
      unlinkedLibraries = unlinkedLibraries
        .map(
          (
            name // Remove underscores
          ) => name.replace(/_/g, "")
        )
        .sort()
        .filter((name, index, arr) => {
          // Remove duplicates
          if (index + 1 >= arr.length) {
            return true;
          }

          return name !== arr[index + 1];
        })
        .join(", ");

      const error = `${constructor.contractName} contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of ${constructor.contractName}: ${unlinkedLibraries}`;

      throw new Error(error);
    }
  },

  convertToEthersBN(original) {
    const converted = [];
    original.forEach(item => {
      // Recurse for arrays
      if (Array.isArray(item)) {
        converted.push(Utils.convertToEthersBN(item));

        // Convert Web3 BN / BigNumber
      } else if (Utils.is_big_number(item)) {
        //HACK: Since we can't rely on web3Utils.isBigNumber to tell
        //whether we have a bignumber.js BigNumber, we'll just check
        //whether it has the toFixed method
        const stringValue = item.toFixed
          ? item.toFixed() //prevents use of scientific notation
          : item.toString();
        const ethersBN = bigNumberify(stringValue);
        converted.push(ethersBN);
      } else {
        converted.push(item);
      }
    });
    return converted;
  },

  /**
   * Multiplies an ethers.js BigNumber and a number with decimal places using
   * integer math rather than using an arbitrary floating-point library like
   * `bignumber.js`.
   * @param  {BigNumber} bignum            an ethers.js BigNumber (use bigNumberify)
   * @param  {Number}    decimal           a number which has 0+ decimal places
   * @param  {Number}    [maxPrecision=5]  the max number of signficant figures
   *                                       `decimal` can have. (default: 5)
   * @return {BigNumber}                   floor(bignum * decimal)
   */
  multiplyBigNumberByDecimal(bignum, decimal, maxPrecision) {
    if (typeof maxPrecision === "undefined") {
      maxPrecision = 5;
    }

    const significantFigures = Math.min(
      decimal.toString().length - 1, // length less one because `.`
      maxPrecision
    );

    const denominator = bigNumberify(10).pow(significantFigures);
    const multiplier = Math.round(decimal * denominator);
    const numerator = bigNumberify(multiplier).mul(bignum);

    return numerator.div(denominator);
  },

  // checks if given contract instance has a set provider
  checkProvider({ currentProvider, contractName }) {
    if (!currentProvider)
      throw new Error(
        `${contractName} error: Please call setProvider() first before calling new().`
      );
  },

  // verifies current network has been assigned to contract instance
  checkNetworkArtifactMatch({ networks, network_id, contractName }) {
    if (networks[network_id] == null)
      throw new Error(
        `${contractName} has not been deployed to detected network (network/artifact mismatch)`
      );
  },

  // verifies contract instance has been deployed
  checkDeployment({ isDeployed, contractName, network_id }) {
    if (!isDeployed())
      throw new Error(
        `${contractName} has not been deployed to detected network (${network_id})`
      );
  },

  // checks if provided contract address has on-chain code
  checkCode(onChainCode, contractName, address) {
    if (!onChainCode || onChainCode.replace("0x", "").replace(/0/g, "") === "")
      throw new Error(
        `Cannot create instance of ${contractName}; no code at address ${address}`
      );
  },

  // parses known contract instance networks
  async parseKnownNetworks(
    { networks, currentProvider, setNetwork, network_id },
    gasLimit
  ) {
    if (!networks && Object.keys(networks).length === 0) {
      return false;
    }
    // go through all the networks that are listed as
    // blockchain uris and see if they match
    for (const network in networks) {
      if (network.startsWith("blockchain://")) {
        const networkMatches = await BlockchainUtils.matches(
          network,
          currentProvider
        );
        if (networkMatches) {
          setNetwork(network);
          return {
            id: network_id,
            blockLimit: gasLimit
          };
        }
      }
    }
    // no match found!
    return false;
  },

  // sets a contract instance network ID
  async setInstanceNetworkID(
    TruffleContractInstance,
    chainNetworkID,
    gasLimit
  ) {
    // if chainNetworkID already present as network configuration, use it
    if (TruffleContractInstance.hasNetwork(chainNetworkID)) {
      TruffleContractInstance.setNetwork(chainNetworkID);
      return {
        id: TruffleContractInstance.network_id,
        blockLimit: gasLimit
      };
    }
    // chainNetworkID not present,
    // parse all known networks
    const matchedNetwork = await Utils.parseKnownNetworks(
      TruffleContractInstance,
      gasLimit
    );
    if (matchedNetwork) return matchedNetwork;

    // network unknown, trust the provider and use given chainNetworkID
    TruffleContractInstance.setNetwork(chainNetworkID);
    return { id: TruffleContractInstance.network_id, blockLimit: gasLimit };
  }
};

Utils.ens = ens;
Utils.bigNumberify = bigNumberify;

module.exports = Utils;
