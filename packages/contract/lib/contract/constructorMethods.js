const { createInterfaceAdapter } = require("@truffle/interface-adapter");
const { importKey } = require("@taquito/signer");
const utils = require("../utils");
const execute = require("../execute");
const bootstrap = require("./bootstrap");

module.exports = Contract => ({
  configureNetwork({ networkType, provider, config } = {}) {
    // otherwise use existing value as default (at most one of these)
    networkType = networkType || this.networkType;
    provider = provider || this.currentProvider;

    // recreate interfaceadapter
    this.interfaceAdapter = createInterfaceAdapter({
      networkType,
      provider,
      config
    });

    // save properties
    this.currentProvider = provider;
    this.networkType = networkType;
  },

  setProvider({ provider, config }) {
    if (!provider && !this.currentProvider) {
      throw new Error(
        `Invalid provider passed to setProvider(); provider is ${provider}`
      );
    }

    this.configureNetwork({ provider, config });
  },

  new() {
    utils.checkProvider(this);
    const { web3, tezos } = this.interfaceAdapter;

    if (web3) {
      if (!this.bytecode || this.bytecode === "0x") {
        throw new Error(
          `${
            this.contractName
          } error: contract binary not set. Can't deploy new instance.\n` +
            `This contract may be abstract, not implement an abstract parent's methods completely\n` +
            `or not invoke an inherited contract's constructor correctly\n`
        );
      }

      const constructorABI = this.abi.filter(i => i.type === "constructor")[0];

      return execute.deployEvm.call(this, constructorABI)(...arguments);
    }

    if (tezos) {
      if (!this.michelson) {
        throw new Error(
          `${
            this.contractName
          } error: contract michelson not set. Can't deploy new instance.\n`
        );
      }

      return execute.deployTezos.call(this)(...arguments);
    }
  },

  async at(address) {
    const { web3, tezos } = this.interfaceAdapter;
    if (web3) {
      if (
        address == null ||
        typeof address !== "string" ||
        address.length !== 42
      ) {
        throw new Error(
          `Invalid address passed to ${this.contractName}.at(): ${address}`
        );
      }

      try {
        await this.detectNetwork();
        const onChainCode = await web3.eth.getCode(address);
        await utils.checkCode(onChainCode, this.contractName, address);
        const contractInstance = new web3.eth.Contract(this.abi);
        contractInstance.options.address = address;
        if (
          this._json.networks[this.network_id] &&
          this._json.networks[this.network_id].address === address
        ) {
          contractInstance.transactionHash = this.transactionHash;
        }
        return new this(contractInstance);
      } catch (error) {
        throw error;
      }
    }

    if (tezos) {
      if (
        address == null ||
        typeof address !== "string" ||
        address.length !== 36
      ) {
        throw new Error(
          `Invalid address passed to ${this.contractName}.at(): ${address}`
        );
      }

      try {
        await this.detectNetwork();
        const contractInstance = await tezos.contract.at(address);
        if (
          this._json.networks[this.network_id] &&
          this._json.networks[this.network_id].address === address
        ) {
          contractInstance.transactionHash = this.transactionHash;
        }
        return new this(contractInstance);
      } catch (error) {
        throw error;
      }
    }
  },

  async deployed() {
    utils.checkProvider(this);
    const { web3, tezos } = this.interfaceAdapter;

    if (web3) {
      try {
        await this.detectNetwork();
        utils.checkNetworkArtifactMatch(this);
        utils.checkDeployment(this);
        const contractInstance = new web3.eth.Contract(this.abi);
        contractInstance.options.address = this.address;
        contractInstance.transactionHash = this.transactionHash;
        return new this(contractInstance);
      } catch (error) {
        throw error;
      }
    }

    if (tezos) {
      try {
        await this.detectNetwork();
        utils.checkNetworkArtifactMatch(this);
        utils.checkDeployment(this);
        const contractInstance = await tezos.contract.at(this.address);
        contractInstance.transactionHash = this.transactionHash;
        return new this(contractInstance);
      } catch (error) {
        throw error;
      }
    }
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
      try {
        const { gasLimit } = await this.interfaceAdapter.getBlock("latest");
        return { id: this.network_id, blockLimit: gasLimit };
      } catch (error) {
        throw error;
      }
    }
    // since artifacts don't have a network_id synced with a network configuration,
    // poll chain for network_id and sync artifacts
    try {
      const chainNetworkID = await this.interfaceAdapter.getNetworkId();
      const { gasLimit } = await this.interfaceAdapter.getBlock("latest");
      return await utils.setInstanceNetworkID(this, chainNetworkID, gasLimit);
    } catch (error) {
      throw error;
    }
  },

  setNetwork(network_id) {
    if (!network_id) return;
    this.network_id = `${network_id}`;
  },

  setNetworkType(networkType = "ethereum") {
    this.configureNetwork({ networkType });
  },

  async setWallet(wallet) {
    this.configureNetwork();
    const { web3, tezos } = this.interfaceAdapter;

    if (web3) web3.eth.accounts.wallet = wallet;
    if (tezos) {
      let { email, password, mnemonic, secret, secretKey } = wallet;

      if (mnemonic) {
        // here we import user's faucet account:
        // email, password, mnemonic, & secret are all REQUIRED.
        if (Array.isArray(mnemonic)) mnemonic = mnemonic.join(" ");
        try {
          return await importKey(tezos, email, password, mnemonic, secret);
        } catch (error) {
          throw Error(`Faucet account invalid or incorrectly imported.`);
        }
      }

      if (secretKey) {
        try {
          return await importKey(tezos, secretKey);
        } catch (error) {
          throw Error(`Secret key invalid or incorrectly imported.`);
        }
      }

      // TODO: add logic to check if user is importing a psk w/ password
      throw Error(`No faucet account or secret key detected.`);
    }
  },

  async storageSchema() {
    const { tezos } = this.interfaceAdapter;
    if (tezos) {
      let schema;
      const { Schema } = require("@taquito/michelson-encoder");

      try {
        schema = new Schema(JSON.parse(this.michelson)[1].args[0]);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(
            `Problem parsing artifact: ${this.contractName}.michelson.`
          );
        }
        throw error;
      }

      return schema.ExtractSchema();
    }
    throw new Error("Method only available for Tezos contract abstractions");
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
