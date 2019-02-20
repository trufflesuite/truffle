const Web3PromiEvent = require("web3-core-promievent");
const BlockchainUtils = require("truffle-blockchain-utils");
const Web3 = require("web3");
const utils = require("../utils");
const execute = require("../execute");
const bootstrap = require("./bootstrap");

module.exports = Contract => {
  return {
    setProvider: function(provider) {
      if (!provider) {
        throw new Error(
          "Invalid provider passed to setProvider(); provider is " + provider
        );
      }

      this.web3.setProvider(provider);
      this.currentProvider = provider;
    },

    new: function() {
      var constructor = this;
      var promiEvent = new Web3PromiEvent();

      if (!constructor.currentProvider) {
        var err =
          constructor.contractName +
          " error: Please call setProvider() first before calling new().";
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

      var args = Array.prototype.slice.call(arguments);

      // Promievent and flag that allows instance to resolve (rather than just receipt)
      var context = {
        contract: constructor,
        promiEvent: promiEvent,
        onlyEmitReceipt: true
      };

      constructor
        .detectNetwork()
        .then(network => {
          utils.checkLibraries.apply(constructor);
          return execute.deploy.call(
            constructor,
            args,
            context,
            network.blockLimit
          );
        })
        .catch(promiEvent.reject);

      return promiEvent.eventEmitter;
    },

    at: function(address) {
      var constructor = this;

      return new Promise(function(accept, reject) {
        if (
          address == null ||
          typeof address !== "string" ||
          address.length !== 42
        ) {
          var err =
            "Invalid address passed to " +
            constructor.contractName +
            ".at(): " +
            address;
          reject(new Error(err));
        }

        return constructor.detectNetwork().then(function() {
          var instance = new constructor(address);

          return constructor.web3.eth.getCode(address).then(function(code) {
            if (!code || code.replace("0x", "").replace(/0/g, "") === "") {
              var err =
                "Cannot create instance of " +
                constructor.contractName +
                "; no code at address " +
                address;
              reject(new Error(err));
            }

            accept(instance);
          });
        });
      });
    },

    deployed: function() {
      var constructor = this;
      return constructor.detectNetwork().then(function() {
        // We don't have a network config for the one we found
        if (constructor._json.networks[constructor.network_id] == null) {
          var error =
            constructor.contractName +
            " has not been deployed to detected network" +
            " (network/artifact mismatch)";
          throw new Error(error);
        }

        // If we found the network but it's not deployed
        if (!constructor.isDeployed()) {
          var error =
            constructor.contractName +
            " has not been deployed to detected network (" +
            constructor.network_id +
            ")";

          throw new Error(error);
        }

        return new constructor(constructor.address);
      });
    },

    defaults: function(class_defaults) {
      if (this.class_defaults == null) {
        this.class_defaults = {};
      }

      if (class_defaults == null) {
        class_defaults = {};
      }

      var constructor = this;
      Object.keys(class_defaults).forEach(function(key) {
        var value = class_defaults[key];
        constructor.class_defaults[key] = value;
      });

      return this.class_defaults;
    },

    hasNetwork: function(network_id) {
      return this._json.networks[network_id + ""] != null;
    },

    isDeployed: function() {
      if (this.network_id == null) {
        return false;
      }

      if (this._json.networks[this.network_id] == null) {
        return false;
      }

      return !!this.network.address;
    },

    detectNetwork: function() {
      var constructor = this;

      return new Promise(function(accept, reject) {
        // Try to get the current blockLimit
        constructor.web3.eth
          .getBlock("latest")
          .then(function(block) {
            // Try to detect the network we have artifacts for.
            if (constructor.network_id) {
              // We have a network id and a configuration, let's go with it.
              if (constructor.networks[constructor.network_id] != null) {
                return accept({
                  id: constructor.network_id,
                  blockLimit: block.gasLimit
                });
              }
            }

            constructor.web3.eth.net
              .getId()
              .then(function(network_id) {
                // If we found the network via a number, let's use that.
                if (constructor.hasNetwork(network_id)) {
                  constructor.setNetwork(network_id);
                  return accept({
                    id: constructor.network_id,
                    blockLimit: block.gasLimit
                  });
                }

                // Otherwise, go through all the networks that are listed as
                // blockchain uris and see if they match.
                var uris = Object.keys(constructor._json.networks).filter(
                  function(network) {
                    return network.indexOf("blockchain://") === 0;
                  }
                );

                var matches = uris.map(function(uri) {
                  return BlockchainUtils.matches.bind(
                    BlockchainUtils,
                    uri,
                    constructor.web3.currentProvider
                  );
                });

                utils.parallel(matches, function(err, results) {
                  if (err) return reject(err);

                  for (var i = 0; i < results.length; i++) {
                    if (results[i]) {
                      constructor.setNetwork(uris[i]);
                      return accept({
                        id: constructor.network_id,
                        blockLimit: block.gasLimit
                      });
                    }
                  }

                  // We found nothing. Set the network id to whatever the provider states.
                  constructor.setNetwork(network_id);
                  return accept({
                    id: constructor.network_id,
                    blockLimit: block.gasLimit
                  });
                });
              })
              .catch(reject);
          })
          .catch(reject);
      });
    },

    setNetwork: function(network_id) {
      if (!network_id) return;
      this.network_id = network_id + "";
    },

    setWallet: function(wallet) {
      this.web3.eth.accounts.wallet = wallet;
    },

    // Overrides the deployed address to null.
    // You must call this explicitly so you don't inadvertently do this otherwise.
    resetAddress: function() {
      delete this.network.address;
    },

    link: function(name, address) {
      var constructor = this;

      // Case: Contract.link(instance)
      if (typeof name === "function") {
        var contract = name;

        if (contract.isDeployed() === false) {
          throw new Error("Cannot link contract without an address.");
        }

        this.link(contract.contractName, contract.address);

        // Merge events so this contract knows about library's events
        Object.keys(contract.events).forEach(function(topic) {
          constructor.network.events[topic] = contract.events[topic];
        });

        return;
      }

      // Case: Contract.link({<libraryName>: <address>, ... })
      if (typeof name === "object") {
        var obj = name;
        Object.keys(obj).forEach(function(name) {
          var a = obj[name];
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
    clone: function(json) {
      var constructor = this;

      json = json || {};

      var temp = function TruffleContract() {
        this.constructor = temp;
        return Contract.apply(this, arguments);
      };

      temp.prototype = Object.create(constructor.prototype);

      var network_id;

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

      temp.web3 = new Web3();
      temp.class_defaults = temp.prototype.defaults || {};

      if (network_id) {
        temp.setNetwork(network_id);
      }

      // Copy over custom key/values to the contract class
      Object.keys(json).forEach(function(key) {
        if (key.indexOf("x-") !== 0) return;
        temp[key] = json[key];
      });

      return temp;
    },

    addProp: function(key, fn) {
      var constructor = this;

      var getter = function() {
        if (fn.get != null) {
          return fn.get.call(constructor);
        }

        return constructor._property_values[key] || fn.call(constructor);
      };

      var setter = function(val) {
        if (fn.set != null) {
          fn.set.call(constructor, val);
          return;
        }

        // If there's not a setter, then the property is immutable.
        throw new Error(key + " property is immutable");
      };

      var definition = {};
      definition.enumerable = false;
      definition.configurable = false;
      definition.get = getter;
      definition.set = setter;

      Object.defineProperty(this, key, definition);
    },

    toJSON: function() {
      return this._json;
    },

    decodeLogs: utils.decodeLogs
  };
};
