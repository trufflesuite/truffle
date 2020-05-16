const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const utils = require("../utils");
const execute = require("../execute");
const bootstrap = require("./bootstrap");
const debug = require("debug")("contract:contract:constructorMethods");

module.exports = Contract => ({
  configureNetwork({ networkType, provider } = {}) {
    // otherwise use existing value as default (at most one of these)
    networkType = networkType || this.networkType;
    provider = provider || this.currentProvider;

    // recreate interfaceadapter
    this.interfaceAdapter = createInterfaceAdapter({ networkType, provider });

    if (this.web3) {
      // update existing
      this.web3.setNetworkType(networkType);
      this.web3.setProvider(provider);
    } else {
      // create new
      this.web3 = new Web3Shim({ networkType, provider });
    }

    // save properties
    this.currentProvider = provider;
    this.networkType = networkType;
  },

  setProvider(provider) {
    if (!provider) {
      throw new Error(
        `Invalid provider passed to setProvider(); provider is ${provider}`
      );
    }

    this.configureNetwork({ provider });
  },

  new() {
    utils.checkProvider(this);

    if (!this.bytecode || this.bytecode === "0x") {
      throw new Error(
        `${
          this.contractName
        } error: contract binary not set. Can't deploy new instance.\n` +
          `This contract may be abstract, not implement an abstract parent's methods completely\n` +
          `or not invoke an inherited contract's constructor correctly\n`
      );
    }

    var constructorABI = this.abi.filter(i => i.type === "constructor")[0];

    return execute.deploy.call(this, constructorABI)(...arguments);
  },

  async at(address) {
    if (
      address == null ||
      typeof address !== "string" ||
      address.length !== 42
    ) {
      throw new Error(
        `Invalid address passed to ${this.contractName}.at(): ${address}`
      );
    }

    await this.detectNetwork();
    const onChainCode = await this.interfaceAdapter.getCode(address);
    await utils.checkCode(onChainCode, this.contractName, address);
    return new this(address);
  },

  async deployed() {
    if (this.reloadJson) {
      this.reloadJson(); //truffle test monkey-patches in this method
    }
    utils.checkProvider(this);
    await this.detectNetwork();
    utils.checkNetworkArtifactMatch(this);
    utils.checkDeployment(this);
    return new this(this.address);
  },

  defaults(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    Object.keys(class_defaults).forEach(key => {
      const value = class_defaults[key];
      this.class_defaults[key] = value;
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
    // if artifacts already have a network_id and network configuration synced,
    // use that network and use latest block gasLimit
    if (this.network_id && this.networks[this.network_id] != null) {
      const { gasLimit } = await this.interfaceAdapter.getBlock("latest");
      return { id: this.network_id, blockLimit: gasLimit };
    }
    // since artifacts don't have a network_id synced with a network configuration,
    // poll chain for network_id and sync artifacts
    const chainNetworkID = await this.interfaceAdapter.getNetworkId();
    const { gasLimit } = await this.interfaceAdapter.getBlock("latest");
    return await utils.setInstanceNetworkID(this, chainNetworkID, gasLimit);
  },

  setNetwork(network_id) {
    if (!network_id) return;
    this.network_id = `${network_id}`;
  },

  setNetworkType(networkType = "ethereum") {
    this.configureNetwork({ networkType });
  },

  setWallet(wallet) {
    this.configureNetwork();

    this.web3.eth.accounts.wallet = wallet;
  },

  // Overrides the deployed address to null.
  // You must call this explicitly so you don't inadvertently do this otherwise.
  resetAddress() {
    delete this.network.address;
  },

  link(name, address) {
    // Case: Contract.link(instance)
    if (typeof name === "function") {
      const contract = name;

      if (contract.isDeployed() === false) {
        throw new Error("Cannot link contract without an address.");
      }

      this.link(contract.contractName, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(topic => {
        this.network.events[topic] = contract.events[topic];
      });

      return;
    }

    // Case: Contract.link({<libraryName>: <address>, ... })
    if (typeof name === "object") {
      const obj = name;
      Object.keys(obj).forEach(name => {
        const a = obj[name];
        this.link(name, a);
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
    json = json || {};

    const temp = function TruffleContract() {
      this.constructor = temp;
      return Contract.apply(this, arguments);
    };

    temp.prototype = Object.create(this.prototype);

    let network_id;

    // If we have a network id passed
    if (typeof json !== "object") {
      network_id = json;
      json = this._json;
    }

    json = utils.merge({}, this._json || {}, json);

    temp._constructorMethods = this._constructorMethods;
    temp._properties = this._properties;

    temp._property_values = {};
    temp._json = json;

    bootstrap(temp);

    temp.class_defaults = temp.prototype.defaults || {};

    if (network_id) {
      temp.setNetwork(network_id);
    }

    if (this.currentProvider) {
      temp.configureNetwork({
        provider: this.currentProvider,
        networkType: this.networkType
      });
    }

    // Copy over custom key/values to the contract class
    Object.keys(json).forEach(key => {
      if (key.indexOf("x-") !== 0) return;
      temp[key] = json[key];
    });

    return temp;
  },

  addProp(key, fn) {
    const getter = () => {
      if (fn.get != null) {
        return fn.get.call(this);
      }

      return this._property_values[key] || fn.call(this);
    };

    const setter = val => {
      if (fn.set != null) {
        fn.set.call(this, val);
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
