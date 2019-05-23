const Web3PromiEvent = require("web3-core-promievent");
const BlockchainUtils = require("truffle-blockchain-utils");
const Web3Shim = require("truffle-interface-adapter").Web3Shim;
const utils = require("../utils");
const execute = require("../execute");
const bootstrap = require("./bootstrap");

module.exports = Contract => ({
  setProvider(provider) {
    if (!provider) {
      throw new Error(
        `Invalid provider passed to setProvider(); provider is ${provider}`
      );
    }

    this.web3.setProvider(provider);
    this.currentProvider = provider;
  },

  new() {
    const constructor = this;
    const promiEvent = new Web3PromiEvent();

    if (!constructor.currentProvider) {
      var err = `${
        constructor.contractName
      } error: Please call setProvider() first before calling new().`;
      throw new Error(err);
    }

    if (!constructor.bytecode || constructor.bytecode === "0x") {
      var err =
        `${
          constructor.contractName
        } error: contract binary not set. Can't deploy new instance.\n` +
        `This contract may be abstract, not implement an abstract parent's methods completely\n` +
        `or not invoke an inherited contract's constructor correctly\n`;

      throw new Error(err);
    }

    const args = Array.prototype.slice.call(arguments);

    // Promievent and flag that allows instance to resolve (rather than just receipt)
    const context = {
      contract: constructor,
      promiEvent,
      onlyEmitReceipt: true
    };

    constructor
      .detectNetwork()
      .then(({ blockLimit }) => {
        utils.checkLibraries.apply(constructor);
        return execute.deploy.call(constructor, args, context, blockLimit);
      })
      .catch(promiEvent.reject);

    return promiEvent.eventEmitter;
  },

  async at(address) {
    const constructor = this;

    if (
      address == null ||
      typeof address !== "string" ||
      address.length !== 42
    ) {
      const err = `Invalid address passed to ${
        constructor.contractName
      }.at(): ${address}`;
      throw new Error(err);
    }

    const checkCode = onChainCode => {
      if (
        !onChainCode ||
        onChainCode.replace("0x", "").replace(/0/g, "") === ""
      )
        throw new Error(
          `Cannot create instance of ${
            constructor.contractName
          }; no code at address ${address}`
        );
    };

    try {
      await constructor.detectNetwork();
      const onChainCode = await constructor.web3.eth.getCode(address);
      await checkCode(onChainCode);
      return new constructor(address);
    } catch (error) {
      throw error;
    }
  },

  deployed() {
    const constructor = this;
    return constructor.detectNetwork().then(() => {
      // We don't have a network config for the one we found
      if (constructor._json.networks[constructor.network_id] == null) {
        var error = `${
          constructor.contractName
        } has not been deployed to detected network (network/artifact mismatch)`;
        throw new Error(error);
      }

      // If we found the network but it's not deployed
      if (!constructor.isDeployed()) {
        var error = `${
          constructor.contractName
        } has not been deployed to detected network (${
          constructor.network_id
        })`;

        throw new Error(error);
      }

      return new constructor(constructor.address);
    });
  },

  defaults(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    const constructor = this;
    Object.keys(class_defaults).forEach(key => {
      const value = class_defaults[key];
      constructor.class_defaults[key] = value;
    });

    return this.class_defaults;
  },

  hasNetwork(network_id) {
    return this._json.networks[`${network_id}`] != null;
  },

  isDeployed() {
    if (this.network_id == null) {
      return false;
    }

    if (this._json.networks[this.network_id] == null) {
      return false;
    }

    return !!this.network.address;
  },

  async detectNetwork() {
    const constructor = this;

    // private helper for parsing known artifact networks
    const parseKnownNetworks = gasLimit => {
      // go through all the networks that are listed as
      // blockchain uris and see if they match
      const uris = Object.keys(constructor._json.networks).filter(
        network => network.indexOf("blockchain://") === 0
      );
      const matches = uris.map(uri =>
        BlockchainUtils.matches.bind(
          BlockchainUtils,
          uri,
          constructor.web3.currentProvider
        )
      );

      utils.parallel(matches, (err, results) => {
        if (err) throw new Error(err);

        for (let i = 0; i < results.length; i++) {
          if (results[i]) {
            constructor.setNetwork(uris[i]);
            return {
              id: constructor.network_id,
              blockLimit: gasLimit
            };
          }
        }
      });
    };

    // private helper used to set an artifact network ID
    const setInstanceNetworkID = (chainNetworkID, gasLimit) => {
      // if chainNetworkID already present as network configuration, use it
      if (constructor.hasNetwork(chainNetworkID)) {
        constructor.setNetwork(chainNetworkID);
        return {
          id: constructor.network_id,
          blockLimit: gasLimit
        };
      }
      // chainNetworkID not present,
      // parse all known networks
      const matchedNetwork = parseKnownNetworks(gasLimit);
      if (matchedNetwork) return matchedNetwork;

      // network unknown, trust the provider and use given chainNetworkID
      constructor.setNetwork(chainNetworkID);
      return { id: constructor.network_id, blockLimit: gasLimit };
    };

    // if artifacts already have a network_id and network configuration synced,
    // use that network and use latest block gasLimit
    if (
      constructor.network_id &&
      constructor.networks[constructor.network_id] != null
    ) {
      try {
        const { gasLimit } = await constructor.web3.eth.getBlock("latest");
        return { id: constructor.network_id, blockLimit: gasLimit };
      } catch (error) {
        throw error;
      }
    } else {
      // since artifacts don't have a network_id synced with a network configuration,
      // poll chain for network_id and sync artifacts
      try {
        const chainNetworkID = await constructor.web3.eth.net.getId();
        const { gasLimit } = await constructor.web3.eth.getBlock("latest");
        return await setInstanceNetworkID(chainNetworkID, gasLimit);
      } catch (error) {
        throw error;
      }
    }
  },

  setNetwork(network_id) {
    if (!network_id) return;
    this.network_id = `${network_id}`;
  },

  setNetworkType(networkType) {
    if (this.web3) {
      this.web3.setNetworkType(networkType);
    }

    this.networkType = networkType;
  },

  setWallet(wallet) {
    this.web3.eth.accounts.wallet = wallet;
  },

  // Overrides the deployed address to null.
  // You must call this explicitly so you don't inadvertently do this otherwise.
  resetAddress() {
    delete this.network.address;
  },

  link(name, address) {
    const constructor = this;

    // Case: Contract.link(instance)
    if (typeof name === "function") {
      const contract = name;

      if (contract.isDeployed() === false) {
        throw new Error("Cannot link contract without an address.");
      }

      this.link(contract.contractName, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(topic => {
        constructor.network.events[topic] = contract.events[topic];
      });

      return;
    }

    // Case: Contract.link({<libraryName>: <address>, ... })
    if (typeof name === "object") {
      const obj = name;
      Object.keys(obj).forEach(name => {
        const a = obj[name];
        constructor.link(name, a);
      });
      return;
    }

    // Case: Contract.link(<libraryName>, <address>)
    if (this._json.networks[this.network_id] == null) {
      this._json.networks[this.network_id] = {
        events: {},
        links: {}
      };
    }

    this.network.links[name] = address;
  },

  // Note, this function can be called with two input types:
  // 1. Object with a bunch of data; this data will be merged with the json data of contract being cloned.
  // 2. network id; this will clone the contract and set a specific network id upon cloning.
  clone(json) {
    const constructor = this;

    json = json || {};

    const temp = function TruffleContract() {
      this.constructor = temp;
      return Contract.apply(this, arguments);
    };

    temp.prototype = Object.create(constructor.prototype);

    let network_id;

    // If we have a network id passed
    if (typeof json !== "object") {
      network_id = json;
      json = constructor._json;
    }

    json = utils.merge({}, constructor._json || {}, json);

    temp._constructorMethods = this._constructorMethods;
    temp._properties = this._properties;

    temp._property_values = {};
    temp._json = json;

    bootstrap(temp);

    temp.web3 = new Web3Shim({
      type: temp.networkType
    });
    temp.class_defaults = temp.prototype.defaults || {};

    if (network_id) {
      temp.setNetwork(network_id);
    }

    // Copy over custom key/values to the contract class
    Object.keys(json).forEach(key => {
      if (key.indexOf("x-") !== 0) return;
      temp[key] = json[key];
    });

    return temp;
  },

  addProp(key, fn) {
    const constructor = this;

    const getter = () => {
      if (fn.get != null) {
        return fn.get.call(constructor);
      }

      return constructor._property_values[key] || fn.call(constructor);
    };

    const setter = val => {
      if (fn.set != null) {
        fn.set.call(constructor, val);
        return;
      }

      // If there's not a setter, then the property is immutable.
      throw new Error(`${key} property is immutable`);
    };

    const definition = {};
    definition.enumerable = false;
    definition.configurable = false;
    definition.get = getter;
    definition.set = setter;

    Object.defineProperty(this, key, definition);
  },

  toJSON() {
    return this._json;
  },

  decodeLogs: utils.decodeLogs
});
