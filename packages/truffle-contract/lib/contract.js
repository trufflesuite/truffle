var BlockchainUtils = require("truffle-blockchain-utils");
var Web3 = require("web3");
var Web3PromiEvent = require('web3-core-promievent');
var webUtils = require('web3-utils');
var StatusError = require("./statuserror");
var Utils = require("./utils");
var execute = require("./execute");
var handle = require("./handlers");

// For browserified version. If browserify gave us an empty version,
// look for the one provided by the user.
if (typeof Web3 == "object" && Object.keys(Web3).length == 0) {
  Web3 = global.Web3;
}

var contract = (function(module) {
  // Accepts a contract object created with web3.eth.Contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract(contract) {
    var self = this;
    var constructor = this.constructor;

    this.abi = constructor.abi;

    // at
    if (typeof contract == "string") {
      var contract_class = new constructor.web3.eth.Contract(this.abi);
      contract_class.options.address = contract;
      contract = contract_class;
    }

    this.contract = contract;
    this.contract.setProvider(constructor.web3.currentProvider); // Web3 now requires this
    this.methods = {};

    // Provision our functions.
    this.abi.forEach(function(item){

      if (item.type == "function") {
        var key;
        var isConstant = item.constant === true;
        var signature = webUtils._jsonInterfaceMethodToString(item);

        var method = function(constant, web3Method){
          var fn;

          (constant)
            ? fn = execute.call(web3Method, constructor, item.inputs)
            : fn = execute.send(web3Method, constructor, self);

          fn.call = execute.call(web3Method, constructor, item.inputs);
          fn.sendTransaction = execute.send(web3Method, constructor, self);
          fn.estimateGas = execute.estimate(web3Method, constructor);
          fn.request = execute.request(web3Method, constructor);

          return fn;
        }

        // We only set the direct access path once - overloaded methods should
        // be invoked via the .methods property although one of
        // them will be available through the contract.
        if(self[item.name] === undefined){
          self[item.name] = method(isConstant, contract.methods[item.name]);
        }

        self.methods[signature] = method(isConstant, contract.methods[signature]);
      }

      if (item.type == "event") {
        self[item.name] = execute.event(contract.events[item.name], constructor, contract);
      }
    })

    this.sendTransaction = execute.sendTransaction(constructor, this);

    this.send = function(value) {
      return self.sendTransaction({value: value});
    };

    this.allEvents = contract.allEvents;
    this.address = contract.options.address;
    this.transactionHash = contract.transactionHash;
    this.__gasMultiplier = 1.25;
  };

  Contract._static_methods = {
    setProvider: function(provider) {
      if (!provider) {
        throw new Error("Invalid provider passed to setProvider(); provider is " + provider);
      }

      /* TURNED THIS OFF - it breaks event listening
      var wrapped = new Provider(provider);
      this.web3.setProvider(wrapped)
      **/

      this.web3.setProvider(provider);
      this.currentProvider = provider;
    },

    __setWallet: function(wallet) {
      this.web3.eth.accounts.wallet = wallet;
    },

    __setGasMulitplier: function(multiplier){
      this.__gasMultiplier = mutiplier;
    },

    new: function() {
      var self = this;
      var promiEvent = new Web3PromiEvent();

      if (this.currentProvider == null) {
        var err = this.contractName + " error: Please call setProvider() first before calling new()."
        throw new Error(err);
      }

      if (!this.bytecode) {
        var err = this._json.contractName + " error: contract binary not set. Can't deploy new instance.";
        throw new Error(err);
      }

      var args = Array.prototype.slice.call(arguments);

      // Args and Promievent for the event management cascade
      var context = {
        promiEvent: promiEvent,
        allowError: true,
        onlyEmitReceipt: true
      }

      self.detectNetwork()
        .then(Utils.checkLibraries.bind(self))
        .then(execute.deploy.bind(self, args, context))
        .catch(promiEvent.reject);

      return promiEvent.eventEmitter;
    },

    at: function(address) {
      var self = this;

      return new Promise(function(accept, reject){
        if (address == null || typeof address != "string" || address.length != 42) {
          var err = "Invalid address passed to " + this._json.contractName + ".at(): " + address;
          reject(new Error(err));
        }

        return self.detectNetwork().then(function(network_id) {
          var instance = new self(address);

          return self.web3.eth.getCode(address).then(function(code){

            if (!code || code.replace("0x", "").replace(/0/g, "") === '') {
              var err = "Cannot create instance of " + self.contractName +
                        "; no code at address " + address;
              reject(new Error(err));
            }

            accept(instance);
          });
        });
      })
    },

    deployed: function() {
      var self = this;
      return self.detectNetwork().then(function() {
        // We don't have a network config for the one we found
        if (self._json.networks[self.network_id] == null) {
          var error = self.contractName +
                      " has not been deployed to detected network" +
                      " (network/artifact mismatch)"
          throw new Error(error);
        }

        // If we found the network but it's not deployed
        if (!self.isDeployed()) {
          var error = self.contractName +
                      " has not been deployed to detected network (" +
                      self.network_id + ")";

          throw new Error(error);
        }

        return new self(self.address);
      });
    },

    defaults: function(class_defaults) {
      if (this.class_defaults == null) {
        this.class_defaults = {};
      }

      if (class_defaults == null) {
        class_defaults = {};
      }

      var self = this;
      Object.keys(class_defaults).forEach(function(key) {
        var value = class_defaults[key];
        self.class_defaults[key] = value;
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
      var self = this;

      return new Promise(function(accept, reject) {
        // Try to get the current blockLimit
        self.web3.eth.getBlock('latest').then(function(block){

          // Try to detect the network we have artifacts for.
          if (self.network_id) {
            // We have a network id and a configuration, let's go with it.
            if (self.networks[self.network_id] != null) {
              return accept(self.network_id, block.gasLimit);
            }
          }

          self.web3.eth.net.getId().then(function(network_id){
            // If we found the network via a number, let's use that.
            if (self.hasNetwork(network_id)) {

              self.setNetwork(network_id);
              return accept(self.network_id, block.gasLimit);
            }

            // Otherwise, go through all the networks that are listed as
            // blockchain uris and see if they match.
            var uris = Object.keys(self._json.networks).filter(function(network) {
              return network.indexOf("blockchain://") == 0;
            });

            var matches = uris.map(function(uri) {
              return BlockchainUtils.matches.bind(BlockchainUtils, uri, self.web3.currentProvider);
            });

            Utils.parallel(matches, function(err, results) {
              if (err) return reject(err);

              for (var i = 0; i < results.length; i++) {
                if (results[i]) {
                  self.setNetwork(uris[i]);
                  return accept(self.network_id, block.gasLimit);
                }
              }

              // We found nothing. Set the network id to whatever the provider states.
              self.setNetwork(network_id);
              return accept(self.network_id, block.gasLimit);
            });

          }).catch(reject);
        }).catch(reject);
      });
    },

    setNetwork: function(network_id) {
      if (!network_id) return;
      this.network_id = network_id + "";
    },

    // Overrides the deployed address to null.
    // You must call this explicitly so you don't inadvertently do this otherwise.
    resetAddress: function() {
      delete this.network.address;
    },

    link: function(name, address) {
      var self = this;

      if (typeof name == "function") {
        var contract = name;

        if (contract.isDeployed() == false) {
          throw new Error("Cannot link contract without an address.");
        }

        this.link(contract.contractName, contract.address);

        // Merge events so this contract knows about library's events
        Object.keys(contract.events).forEach(function(topic) {
          self.network.events[topic] = contract.events[topic];
        });

        return;
      }

      if (typeof name == "object") {
        var obj = name;
        Object.keys(obj).forEach(function(name) {
          var a = obj[name];
          self.link(name, a);
        });
        return;
      }

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
      var self = this;

      json = json || {};

      var temp = function TruffleContract() {
        this.constructor = temp;
        return Contract.apply(this, arguments);
      };

      temp.prototype = Object.create(self.prototype);

      var network_id;

      // If we have a network id passed
      if (typeof json != "object") {
        network_id = json;
        json = self._json;
      }

      json = Utils.merge({}, self._json || {}, json);

      temp._static_methods = this._static_methods;
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
      var self = this;

      var getter = function() {
        if (fn.get != null) {
          return fn.get.call(self);
        }

        return self._property_values[key] || fn.call(self);
      }
      var setter = function(val) {
        if (fn.set != null) {
          fn.set.call(self, val);
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
    }
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
        var transactionHash = this.network.transactionHash;

        if(transactionHash === null) {
          throw new Error("Could not find transaction hash for " + this.contractName);
        }

        return transactionHash;
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
      return Utils.linkBytecode(this.bytecode, this.links);
    },
    deployedBinary: function() {
      return Utils.linkBytecode(this.deployedBytecode, this.links);
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
    }
  };

  function bootstrap(fn) {
    // Add our static methods
    // Add something here about excluding send, privately defined methods
    Object.keys(fn._static_methods).forEach(function(key) {
      fn[key] = fn._static_methods[key].bind(fn);
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
