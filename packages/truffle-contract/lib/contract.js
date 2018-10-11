var BlockchainUtils = require("truffle-blockchain-utils");
var Web3 = require("web3");
var Web3PromiEvent = require('web3-core-promievent');
var webUtils = require('web3-utils');
var StatusError = require("./statuserror");
var utils = require("./utils");
var execute = require("./execute");
var handle = require("./handlers");

// For browserified version. If browserify gave us an empty version,
// look for the one provided by the user.
if (typeof Web3 == "object" && Object.keys(Web3).length == 0) {
  Web3 = global.Web3;
}

var contract = (function(module) {
  // Accepts a contract object created with web3.eth.Contract or an address.
  function Contract(contract) {
    var instance = this;
    var constructor = instance.constructor;

    // Disambiguate between .at() and .new()
    if (typeof contract == "string") {
      var web3Instance = new constructor.web3.eth.Contract(constructor.abi);
      web3Instance.options.address = contract;
      contract = web3Instance;
    }

    // Core:
    instance.methods = {};
    instance.abi = constructor.abi;
    instance.address = contract.options.address;
    instance.transactionHash = contract.transactionHash;
    instance.contract = contract;

    // User defined methods, overloaded methods, events
    instance.abi.forEach(function(item){

      switch(item.type) {
        case "function":
          var isConstant =
            ["pure", "view"].includes(item.stateMutability) ||  // new form
            item.constant;  // deprecated case

          var signature = webUtils._jsonInterfaceMethodToString(item);

          var method = function(constant, web3Method){
            var fn;

            (constant)
              ? fn = execute.call.call(constructor, web3Method, item, instance.address)
              : fn = execute.send.call(constructor, web3Method, instance.address);

            fn.call = execute.call.call(constructor, web3Method, item, instance.address);
            fn.sendTransaction = execute.send.call(constructor, web3Method, instance.address);
            fn.estimateGas = execute.estimate.call(constructor, web3Method, instance.address);
            fn.request = execute.request.call(constructor, web3Method, instance.address);

            return fn;
          }

          // Only define methods once. Any overloaded methods will have all their
          // accessors available by ABI signature available on the `methods` key below.
          if(instance[item.name] === undefined ){
            instance[item.name] = method(isConstant, contract.methods[item.name]);
          }

          // Overloaded methods should be invoked via the .methods property
          instance.methods[signature] = method(isConstant, contract.methods[signature]);
          break;

        case "event":
          instance[item.name] = execute.event.call(constructor, contract.events[item.name]);
          break;
      }
    })

    // sendTransaction / send
    instance.sendTransaction = execute.send.call(constructor, null, instance.address);

    // Prefer user defined `send`
    if (!instance.send){
      instance.send = (value, txParams={}) => {
        const packet = Object.assign({value: value}, txParams);
        return instance.sendTransaction(packet)
      };
    }

    // Other events
    instance.allEvents = execute.allEvents.call(constructor, contract);
    instance.getPastEvents = execute.getPastEvents.call(constructor, contract);
  };

  Contract._constructorMethods = {
    setProvider: function(provider) {
      if (!provider) {
        throw new Error("Invalid provider passed to setProvider(); provider is " + provider);
      }

      this.web3.setProvider(provider);
      this.currentProvider = provider;
    },

    new: function() {
      var constructor = this;
      var promiEvent = new Web3PromiEvent();

      if (!constructor.currentProvider) {
        var err = constructor.contractName + " error: Please call setProvider() first before calling new()."
        throw new Error(err);
      }

      if (!constructor.bytecode || constructor.bytecode === "0x") {
        var err = `${constructor.contractName} error: contract binary not set. Can't deploy new instance.\n` +
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
      }

      constructor.detectNetwork().then(network => {
        utils.checkLibraries.apply(constructor);
        return execute.deploy.call(constructor, args, context, network.blockLimit);
      }).catch(promiEvent.reject)

      return promiEvent.eventEmitter;
    },

    at: function(address) {
      var constructor = this;

      return new Promise(function(accept, reject){
        if (address == null || typeof address != "string" || address.length != 42) {
          var err = "Invalid address passed to " + constructor.contractName + ".at(): " + address;
          reject(new Error(err));
        }

        return constructor.detectNetwork().then(function(network_id) {
          var instance = new constructor(address);

          return constructor.web3.eth.getCode(address).then(function(code){

            if (!code || code.replace("0x", "").replace(/0/g, "") === '') {
              var err = "Cannot create instance of " + constructor.contractName +
                        "; no code at address " + address;
              reject(new Error(err));
            }

            accept(instance);
          });
        });
      })
    },

    deployed: function() {
      var constructor = this;
      return constructor.detectNetwork().then(function() {
        // We don't have a network config for the one we found
        if (constructor._json.networks[constructor.network_id] == null) {
          var error = constructor.contractName +
                      " has not been deployed to detected network" +
                      " (network/artifact mismatch)"
          throw new Error(error);
        }

        // If we found the network but it's not deployed
        if (!constructor.isDeployed()) {
          var error = constructor.contractName +
                      " has not been deployed to detected network (" +
                      constructor.network_id + ")";

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
        constructor.web3.eth.getBlock('latest').then(function(block){
          // Try to detect the network we have artifacts for.
          if (constructor.network_id) {
            // We have a network id and a configuration, let's go with it.
            if (constructor.networks[constructor.network_id] != null) {
              return accept({id: constructor.network_id, blockLimit: block.gasLimit});
            }
          }

          constructor.web3.eth.net.getId().then(function(network_id){
            // If we found the network via a number, let's use that.
            if (constructor.hasNetwork(network_id)) {

              constructor.setNetwork(network_id);
              return accept({id: constructor.network_id, blockLimit: block.gasLimit});
            }

            // Otherwise, go through all the networks that are listed as
            // blockchain uris and see if they match.
            var uris = Object.keys(constructor._json.networks).filter(function(network) {
              return network.indexOf("blockchain://") == 0;
            });

            var matches = uris.map(function(uri) {
              return BlockchainUtils.matches.bind(BlockchainUtils, uri, constructor.web3.currentProvider);
            });

            utils.parallel(matches, function(err, results) {
              if (err) return reject(err);

              for (var i = 0; i < results.length; i++) {
                if (results[i]) {
                  constructor.setNetwork(uris[i]);
                  return accept({id: constructor.network_id, blockLimit: block.gasLimit});
                }
              }

              // We found nothing. Set the network id to whatever the provider states.
              constructor.setNetwork(network_id);
              return accept({id: constructor.network_id, blockLimit: block.gasLimit});
            });

          }).catch(reject);
        }).catch(reject);
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
      if (typeof name == "function") {
        var contract = name;

        if (contract.isDeployed() == false) {
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
      if (typeof name == "object") {
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
      if (typeof json != "object") {
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
        if (key.indexOf("x-") != 0) return;
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
      }
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
  };


  // Getter functions are scoped to Contract object.
  Contract._properties = {
    contract_name: {
      get: function() {
        return this.contractName;
      },
      set: function(val) {
        this.contractName = val;
      }
    },
    contractName: {
      get: function() {
        return this._json.contractName || "Contract";
      },
      set: function(val) {
        this._json.contractName = val;
      }
    },

    gasMultiplier: {
      get: function() {
        if (this._json.gasMultiplier === undefined){
          this._json.gasMultiplier = 1.25;
        }
        return this._json.gasMultiplier;
      },
      set: function(val) {
        this._json.gasMultiplier = val;
      }
    },
    timeoutBlocks: {
      get: function() {
        return this._json.timeoutBlocks;
      },
      set: function(val) {
        this._json.timeoutBlocks = val;
      }
    },
    autoGas: {
      get: function() {
        if (this._json.autoGas === undefined){
          this._json.autoGas = true;
        }
        return this._json.autoGas;
      },
      set: function(val) {
        this._json.autoGas = val;
      }
    },
    numberFormat: {
      get: function() {
        if (this._json.numberFormat === undefined){
          this._json.numberFormat = 'BN';
        }
        return this._json.numberFormat;
      },
      set: function(val) {
        const allowedFormats = [
          'BigNumber',
          'BN',
          'String'
        ];

        const msg = `Invalid number format setting: "${val}": ` +
                    `valid formats are: ${JSON.stringify(allowedFormats)}.`;

        if (!allowedFormats.includes(val)) throw new Error(msg);

        this._json.numberFormat = val;
      }
    },
    abi: {
      get: function() {
        return this._json.abi;
      },
      set: function(val) {
        this._json.abi = val;
      }
    },
    network: function() {
      var network_id = this.network_id;

      if (network_id == null) {
        var error = this.contractName + " has no network id set, cannot lookup artifact data." +
                    " Either set the network manually using " + this.contractName +
                    ".setNetwork(), run " + this.contractName + ".detectNetwork(), or use new()," +
                    " at() or deployed() as a thenable which will detect the network automatically.";

        throw new Error(error);
      }

      // TODO: this might be bad; setting a value on a get.
      if (this._json.networks[network_id] == null) {
        var error = this.contractName + " has no network configuration" +
                    " for its current network id (" + network_id + ").";

        throw new Error(error);
      }

      var returnVal = this._json.networks[network_id];

      // Normalize output
      if (returnVal.links == null) {
        returnVal.links = {};
      }

      if (returnVal.events == null) {
        returnVal.events = {};
      }

      return returnVal;
    },
    networks: function() {
      return this._json.networks;
    },
    address: {
      get: function() {
        var address = this.network.address;

        if (address == null) {
          var error = "Cannot find deployed address: " +
                      this.contractName + " not deployed or address not set."
          throw new Error(error);
        }

        return address;
      },
      set: function(val) {
        if (val == null) {
          throw new Error("Cannot set deployed address; malformed value: " + val);
        }

        var network_id = this.network_id;

        if (network_id == null) {
          var error = this.contractName + " has no network id set, cannot lookup artifact data." +
                      " Either set the network manually using " + this.contractName +
                      ".setNetwork(), run " + this.contractName + ".detectNetwork()," +
                      " or use new(), at() or deployed() as a thenable which will" +
                      " detect the network automatically.";

          throw new Error(error)
        }

        // Create a network if we don't have one.
        if (this._json.networks[network_id] == null) {
          this._json.networks[network_id] = {
            events: {},
            links: {}
          };
        }

        // Finally, set the address.
        this.network.address = val;
      }
    },
    transactionHash: {
      get: function() {
        return this.network.transactionHash;
      },
      set: function(val) {
        this.network.transactionHash = val;
      }
    },
    links: function() {
      if (!this.network_id) {
        var error = this.contractName + " has no network id set, cannot lookup artifact data." +
                    " Either set the network manually using " + this.contractName + ".setNetwork()," +
                    " run " + this.contractName + ".detectNetwork(), or use new(), at()" +
                    " or deployed() as a thenable which will detect the network automatically.";

        throw new Error(error)
      }

      if (this._json.networks[this.network_id] == null) {
        return {};
      }

      return this.network.links || {};
    },
    events: function() {
      // helper web3; not used for provider
      var web3 = new Web3();

      var events;

      if (this._json.networks[this.network_id] == null) {
        events = {};
      } else {
        events = this.network.events || {};
      }

      // Merge abi events with whatever's returned.
      var abi = this.abi;

      abi.forEach(function(item) {
        if (item.type != "event") return;

        var signature = item.name + "(";

        item.inputs.forEach(function(input, index) {
          signature += input.type;

          if (index < item.inputs.length - 1) {
            signature += ",";
          }
        });

        signature += ")";

        var topic = web3.utils.keccak256(signature);

        events[topic] = item;
      });

      return events;
    },
    binary: function() {
      return utils.linkBytecode(this.bytecode, this.links);
    },
    deployedBinary: function() {
      return utils.linkBytecode(this.deployedBytecode, this.links);
    },

    // deprecated; use bytecode
    unlinked_binary: {
      get: function() {
        return this.bytecode;
      },
      set: function(val) {
        this.bytecode = val;
      }
    },
    // alias for unlinked_binary; unlinked_binary will eventually be deprecated
    bytecode: {
      get: function() {
        return this._json.bytecode;
      },
      set: function(val) {
        this._json.bytecode = val;
      }
    },
    deployedBytecode: {
      get: function() {
        var code = this._json.deployedBytecode;

        if (code.indexOf("0x") != 0) {
          code = "0x" + code;
        }

        return code;
      },
      set: function(val) {
        var code = val;

        if (val.indexOf("0x") != 0) {
          code = "0x" + code;
        }

        this._json.deployedBytecode = code;
      }
    },
    sourceMap: {
      get: function() {
        return this._json.sourceMap;
      },
      set: function(val) {
        this._json.sourceMap = val;
      }
    },
    deployedSourceMap: {
      get: function() {
        return this._json.deployedSourceMap;
      },
      set: function(val) {
        this._json.deployedSourceMap = val;
      }
    },
    source: {
      get: function() {
        return this._json.source;
      },
      set: function(val) {
        this._json.source = val;
      }
    },
    sourcePath: {
      get: function() {
        return this._json.sourcePath;
      },
      set: function(val) {
        this._json.sourcePath = val;
      }
    },
    legacyAST: {
      get: function() {
        return this._json.legacyAST;
      },
      set: function(val) {
        this._json.legacyAST = val;
      }
    },
    ast: {
      get: function() {
        return this._json.ast;
      },
      set: function(val) {
        this._json.ast = val;
      }
    },
    compiler: {
      get: function() {
        return this._json.compiler;
      },
      set: function(val) {
        this._json.compiler = val;
      }
    },
    // Deprecated
    schema_version: function() {
      return this.schemaVersion;
    },
    schemaVersion: function() {
      return this._json.schemaVersion;
    },
    // deprecated
    updated_at: function() {
      return this.updatedAt;
    },
    updatedAt: function() {
      try {
        return this.network.updatedAt || this._json.updatedAt;
      } catch (e) {
        return this._json.updatedAt;
      }
    },
    userdoc: function() {
      return this._json.userdoc;
    },
    devdoc: function() {
      return this._json.devdoc;
    }
  };

  function bootstrap(fn) {
    // Add our static methods
    // Add something here about excluding send, privately defined methods
    Object.keys(fn._constructorMethods).forEach(function(key) {
      fn[key] = fn._constructorMethods[key].bind(fn);
    });

    // Add our properties.
    Object.keys(fn._properties).forEach(function(key) {
      fn.addProp(key, fn._properties[key]);
    });

    // estimateGas as sub-property of new
    fn['new'].estimateGas = execute.estimateDeployment.bind(fn);

    return fn;
  };

  bootstrap(Contract);
  module.exports = Contract;

  return Contract;
})(module || {});
