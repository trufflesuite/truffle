var ethJSABI = require("ethjs-abi");
var BlockchainUtils = require("truffle-blockchain-utils");
var Web3 = require("web3");
var StatusError = require("./statuserror.js");
var Web3PromiEvent = require('web3-core-promievent');

// For browserified version. If browserify gave us an empty version,
// look for the one provided by the user.
if (typeof Web3 == "object" && Object.keys(Web3).length == 0) {
  Web3 = global.Web3;
}

var contract = (function(module) {

  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    return this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    return this.provider.sendAsync.apply(this.provider, arguments);
  };

  // Helper web3
  var _web3 = new Web3();

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      return _web3.utils.isBN(val) || _web3.utils.isBigNumber(val);
    },

    // Error after some number of ms if receipt never arrives
    synchronize: function(start, context){
      var sync = context.contract.synchronization_timeout;
      var timeout;

      ( sync === 0 || sync !== undefined)
        ? timeout = sync
        : timeout = 240000;

      if (timeout > 0 && new Date().getTime() - start > timeout) {
        var err = new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!")
        context.promievent.reject(err);
      }
    },

    getTxParams: function(args, C){
      var tx_params =  {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }
      tx_params = Utils.merge(C.class_defaults, tx_params);
      return tx_params;
    },

    // Web3 1.0 does its own event decoding: just translating
    // a couple keys for backward compatibility.
    convertEventsToLogs: function(events){
      var logs = [];
      Object.keys(events).forEach(function(key){
        events[key].args = events[key].returnValues;
        logs.push(events[key]);
      })
      return logs;
    },

    // Emitter handlers for `send` / `sendTransaction` / `new`:
    // This is the order they're executed in. Web3's `.send` permits
    // either EventEmitter OR Promise, not both. So we track state in the
    // context object between `handleHash` and `handleReceipt`.
    handleError: function(context, error){
      context.promiEvent.eventEmitter.emit('error', error);
      if (!context.allowError){
        context.promiEvent.reject(error);
      }

      // Should we kill the setInterval here too?
    },

    // Collect hash for contract.new (we attach it to the contract there)
    // Start polling and collect interval so we can kill poll in `handleReceipt`
    // and `contract.new.then`
    handleHash: function(context, hash){
      var start = new Date().getTime();
      context.transactionHash = hash;
      context.promiEvent.eventEmitter.emit('transactionHash', hash);
      context.interval = setInterval(function(){Utils.synchronize(start, context)}, 1000);
    },

    handleConfirmation: function(context, number, receipt){
      context.promiEvent.eventEmitter.emit('confirmation', number, receipt)
    },

    handleReceipt: function(context, receipt){
      var logs;
      context.receipt = receipt;
      context.promiEvent.eventEmitter.emit('receipt', receipt)

      if (context.onlyEmitReceipt)
        return;

      clearInterval(context.interval);

      if (parseInt(receipt.status) == 0){
        var error = new StatusError(context.tx_params, receipt.transactionHash, receipt);
        context.promiEvent.reject(error)
      }

      (receipt.events)
        ? logs = Utils.convertEventsToLogs(receipt.events)
        : log = [];

      context.promiEvent.resolve({
        tx: receipt.transactionHash,
        receipt: receipt,
        logs: logs
      });
    },

    // Execution wrappers
    executeAsCall: function(fn, C, inputs) {
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];
        var defaultBlock;

        // It's only tx_params if it's an object and not a BigNumber.
        // It's only defaultBlock if there's an extra non-object input that's not tx_params.
        var hasTxParams = Utils.is_object(last_arg) && !Utils.is_big_number(last_arg);
        var hasDefaultBlock = !hasTxParams && args.length > inputs.length;
        var hasDefaultBlockWithParams = hasTxParams && args.length - 1 > inputs.length;

        // Detect and extract defaultBlock parameter
        if (hasDefaultBlock || hasDefaultBlockWithParams) {
            defaultBlock = args.pop();
        }
        // Get tx params
        if (hasTxParams) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        // Overcomplicated
        return C.detectNetwork().then(function() {
          return (defaultBlock !== undefined)
            ? fn(...args).call(tx_params, defaultBlock)
            : fn(...args).call(tx_params);
        });
      };
    },

    executeAsEstimate : function(fn, C){
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = Utils.getTxParams(args, C);

        return C.detectNetwork().then(function() {
            return fn(...args).estimateGas(tx_params);
        });
      };
    },

    executeAsSend: function(fn, instance, C) {
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = Utils.getTxParams(args, C);

        var context = {
          contract: C,
          promiEvent: new Web3PromiEvent(),
          tx_params: tx_params
        }

        // .then never resolves here if emitters are attached, so
        // we're just resolving our own PromiEvent in the receipt handler.
        C.detectNetwork().then(function() {
          fn(...args).send(tx_params)
            .on('error', Utils.handleError.bind(this, context))
            .on('transactionHash', Utils.handleHash.bind(this, context))
            .on('confirmation', Utils.handleConfirmation.bind(this, context))
            .on('receipt', Utils.handleReceipt.bind(this, context));

        }).catch(context.promiEvent.reject);

        return context.promiEvent.eventEmitter;
      };
    },

    executeSendTransaction : function(C, _self) {
      var self = _self;
      return function(tx_params, callback){
        if (typeof tx_params == "function") {
          callback = tx_params;
          tx_params = {};
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);
        tx_params.to = self.address;

        if (callback !== undefined){
          return C.detectNetwork().then(function(){
            C.web3.eth.sendTransaction.apply(C.web3.eth, [tx_params, callback]);
          })
        }

        var context = {
          contract: C,
          promiEvent: new Web3PromiEvent(),
          tx_params: tx_params
        }

        // .then never resolves here if emitters are attached, so
        // we're just resolving our own PromiEvent in the receipt handler.
        C.detectNetwork().then(function() {

          C.web3.eth.sendTransaction(tx_params)
            .on('error', Utils.handleError.bind(this, context))
            .on('transactionHash', Utils.handleHash.bind(this, context))
            .on('confirmation', Utils.handleConfirmation.bind(this, context))
            .on('receipt', Utils.handleReceipt.bind(this, context));

        }).catch(context.promiEvent.reject);

        return context.promiEvent.eventEmitter;
      }
    },

    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    parallel: function (arr, callback) {
      callback = callback || function () {};
      if (!arr.length) {
        return callback(null, []);
      }
      var index = 0;
      var results = new Array(arr.length);
      arr.forEach(function (fn, position) {
        fn(function (err, result) {
          if (err) {
            callback(err);
            callback = function () {};
          } else {
            index++;
            results[position] = result;
            if (index >= arr.length) {
              callback(null, results);
            }
          }
        });
      });
    },
    bootstrap: function(fn) {
      // Add our static methods
      Object.keys(fn._static_methods).forEach(function(key) {
        fn[key] = fn._static_methods[key].bind(fn);
      });

      // Add our properties.
      Object.keys(fn._properties).forEach(function(key) {
        fn.addProp(key, fn._properties[key]);
      });

      // estimateGas as sub-property of new
      fn['new'].estimateGas = fn._static_methods.estimateDeployment.bind(fn);

      return fn;
    },
    linkBytecode: function(bytecode, links) {
      Object.keys(links).forEach(function(library_name) {
        var library_address = links[library_name];
        var regex = new RegExp("__" + library_name + "_+", "g");

        bytecode = bytecode.replace(regex, library_address.replace("0x", ""));
      });

      return bytecode;
    }
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract(contract) {
    var self = this;
    var constructor = this.constructor;

    this.abi = constructor.abi;

    // at:
    if (typeof contract == "string") {
      var contract_class = new constructor.web3.eth.Contract(this.abi);
      contract_class.options.address = contract;
      contract = contract_class;
    }

    this.contract = contract;

    // Provision our functions.
    for (var i = 0; i < this.abi.length; i++) {
      var item = this.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          this[item.name] = Utils.executeAsCall(contract.methods[item.name], constructor, item.inputs);
        } else {
          this[item.name] = Utils.executeAsSend(contract.methods[item.name], this, constructor);
        }

        this[item.name].call = Utils.executeAsCall(contract.methods[item.name], constructor, item.inputs);
        this[item.name].sendTransaction = Utils.executeAsSend(contract.methods[item.name], constructor);
        this[item.name].request = contract.methods[item.name].request;
        this[item.name].estimateGas = Utils.executeAsEstimate(contract.methods[item.name], constructor);
      }

      if (item.type == "event") {
        this[item.name] = contract[item.name];
      }
    }

    //this._static_methods.new.estimateGas = Utils.executeAsDeploymentEstimate(self);
    this.sendTransaction = Utils.executeSendTransaction(constructor, this);

    this.send = function(value) {
      return self.sendTransaction({value: value});
    };

    this.allEvents = contract.allEvents;
    this.address = contract.options.address;
    this.transactionHash = contract.transactionHash;
  };

  Contract._static_methods = {
    setProvider: function(provider) {
      if (!provider) {
        throw new Error("Invalid provider passed to setProvider(); provider is " + provider);
      }

      var wrapped = new Provider(provider);
      this.web3.setProvider(wrapped);
      this.currentProvider = provider;
    },

    new: function() {
      var self = this;

      if (this.currentProvider == null) {
        throw new Error(this.contractName + " error: Please call setProvider() first before calling new().");
      }

      if (!this.bytecode) {
        throw new Error(this._json.contractName + " error: contract binary not set. Can't deploy new instance.");
      }

      var args = Array.prototype.slice.call(arguments);

      // Args and Promievent for the event management cascade
      var context = {
        promiEvent: new Web3PromiEvent(),
        allowError: true,
        doNotResolve: true,
        onlyEmitReceipt: true
      }

      self.detectNetwork().then(function(network_id) {
        // After the network is set, check to make sure everything's ship shape.
        var regex = /__[^_]+_+/g;
        var unlinked_libraries = self.binary.match(regex);

        if (unlinked_libraries != null) {
          unlinked_libraries = unlinked_libraries.map(function(name) {
            // Remove underscores
            return name.replace(/_/g, "");
          }).sort().filter(function(name, index, arr) {
            // Remove duplicates
            if (index + 1 >= arr.length) {
              return true;
            }

            return name != arr[index + 1];
          }).join(", ");

          throw new Error(self.contractName + " contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of " + self._json.contractName + ": " + unlinked_libraries);
        }
      }).then(function() {
        var tx_params = Utils.getTxParams(args, self);

        var options = {
          data: tx_params.data || self.binary,
          arguments: args
        };

        delete tx_params['data'];

        var contract_class = new self.web3.eth.Contract(self.abi, tx_params);

        contract_class
          .deploy(options)
          .send()
          .on('error', Utils.handleError.bind(this, context))
          .on('transactionHash', Utils.handleHash.bind(this, context))
          .on('receipt', Utils.handleReceipt.bind(this, context))
          .on('confirmation', Utils.handleConfirmation.bind(this, context))

          .then(function(instance){
            clearInterval(context.interval);

            if (parseInt(context.receipt.status) == 0){
              var error = new StatusError(tx_params, context.transactionHash, context.receipt);
              context.promiEvent.reject(error)
            }

            instance.transactionHash = context.transactionHash;
            context.promiEvent.resolve(new self(instance));
          })
          .catch(context.promiEvent.reject)
      }).catch(context.promiEvent.reject);

      return context.promiEvent.eventEmitter;
    },

    estimateDeployment : function(){
      var self = this;
      var args = Array.prototype.slice.call(arguments);

      return self.detectNetwork().then(function() {
        var tx_params = Utils.getTxParams(args, self);

        var options = {
          data: tx_params.data || self.binary,
          arguments: args
        };

        delete tx_params['data'];

        var contract_class = new self.web3.eth.Contract(self.abi, tx_params);
        return contract_class.deploy(options).estimateGas(tx_params)
      });
    },

    at: function(address) {
      var self = this;

      return new Promise(function(accept, reject){
        if (address == null || typeof address != "string" || address.length != 42) {
          reject(Error("Invalid address passed to " + this._json.contractName + ".at(): " + address));
        }

        return self.detectNetwork().then(function(network_id) {
          var instance = new self(address);

          return self.web3.eth.getCode(address).then(function(code){
            var empty = code.replace("0x", "").replace(/0/g, "") === '';

            if (!code || empty) {
              reject(new Error("Cannot create instance of " + self.contractName + "; no code at address " + address));
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
          throw new Error(self.contractName + " has not been deployed to detected network (network/artifact mismatch)");
        }

        // If we found the network but it's not deployed
        if (!self.isDeployed()) {
          throw new Error(self.contractName + " has not been deployed to detected network (" + self.network_id + ")");
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
        // Try to detect the network we have artifacts for.
        if (self.network_id) {
          // We have a network id and a configuration, let's go with it.
          if (self.networks[self.network_id] != null) {
            return accept(self.network_id);
          }
        }

        self.web3.eth.net.getId().then(function(network_id){
          // If we found the network via a number, let's use that.
          if (self.hasNetwork(network_id)) {

            self.setNetwork(network_id);
            accept(network_id);
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
            if (err) reject(err);

            for (var i = 0; i < results.length; i++) {
              if (results[i]) {
                console.log('parallel' + network_id);
                self.setNetwork(uris[i]);
                accept(network_id);
              }
            }

            // We found nothing. Set the network id to whatever the provider states.
            self.setNetwork(network_id);
            accept(network_id);
          });

        }).catch(function(err){
          reject(err);
        });
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

      Utils.bootstrap(temp);

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
        throw new Error(this.contractName + " has no network id set, cannot lookup artifact data. Either set the network manually using " + this.contractName + ".setNetwork(), run " + this.contractName + ".detectNetwork(), or use new(), at() or deployed() as a thenable which will detect the network automatically.");
      }

      // TODO: this might be bad; setting a value on a get.
      if (this._json.networks[network_id] == null) {
        throw new Error(this.contractName + " has no network configuration for its current network id (" + network_id + ").");
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
          throw new Error("Cannot find deployed address: " + this.contractName + " not deployed or address not set.");
        }

        return address;
      },
      set: function(val) {
        if (val == null) {
          throw new Error("Cannot set deployed address; malformed value: " + val);
        }

        var network_id = this.network_id;

        if (network_id == null) {
          throw new Error(this.contractName + " has no network id set, cannot lookup artifact data. Either set the network manually using " + this.contractName + ".setNetwork(), run " + this.contractName + ".detectNetwork(), or use new(), at() or deployed() as a thenable which will detect the network automatically.");
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
        throw new Error(this.contractName + " has no network id set, cannot lookup artifact data. Either set the network manually using " + this.contractName + ".setNetwork(), run " + this.contractName + ".detectNetwork(), or use new(), at() or deployed() as a thenable which will detect the network automatically.");
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

        var topic = web3.sha3(signature);

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

  Utils.bootstrap(Contract);
  module.exports = Contract;

  return Contract;
})(module || {});
