var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");
var BINARIES = {{BINARIES}};

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
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
    decodeLogs: function(C, instance, logs) {
      return logs.map(function(log) {
        var logABI = C.events[log.topics[0]];

        if (logABI == null) {
          return null;
        }

        var decoder = new SolidityEvent(null, logABI, instance.address);
        return decoder.decode(log);
      }).filter(function(log) {
        return log != null;
      });
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return C.detectNetwork().then(function(network_id) {
          return new Promise(function(accept, reject) {
            var callback = function(error, result) {
              if (error != null) {
                reject(error);
              } else {
                accept(result);
              }
            };
            args.push(tx_params, callback);
            fn.apply(instance.contract, args);
          });
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return C.detectNetwork().then(function(network_id) {
          return new Promise(function(accept, reject) {
            var callback = function(error, tx) {
              if (error != null) {
                reject(error);
                return;
              }

              var timeout = C.synchronization_timeout || 240000;
              var start = new Date().getTime();

              var make_attempt = function() {
                C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                  if (err) return reject(err);

                  if (receipt != null) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: Utils.decodeLogs(C, instance, receipt.logs)
                    });
                  }

                  if (timeout > 0 && new Date().getTime() - start > timeout) {
                    return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                  }

                  setTimeout(make_attempt, 1000);
                });
              };

              make_attempt();
            };

            args.push(tx_params, callback);
            fn.apply(self, args);
          });
        });
      };
    }
  };

  // contract can be an address or web3 contract instance.
  function instantiate(instance, contract) {
    var constructor = instance.constructor;
    instance.abi = constructor.abi;

    if (typeof contract == "string") {
      var address = contract;
      var contract_class = constructor.web3.eth.contract(instance.abi);
      contract = contract_class.at(address);
    }

    instance.contract = contract;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { this.constructor = temp; return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    temp._property_values = {};

    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Add our properties.
    Object.keys(fn._properties).forEach(function(key) {
      fn._addProp(key, fn._properties[key]);
    });

    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : null;
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    if (!provider) {
      throw new Error("Invalid provider passed to setProvider(); provider is " + provider);
    }

    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    var self = this;

    if (this.currentProvider == null) {
      throw new Error(this.binaries.contract_name + " error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error(this.binaries.contract_name + " error: contract binary not set. Can't deploy new instance.");
    }

    return self.detectNetwork().then(function(network_id) {
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

        throw new Error(self.binaries.contract_name + " contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of " + self.binaries.contract_name + ": " + unlinked_libraries);
      }
    }).then(function() {
      return new Promise(function(accept, reject) {
        var contract_class = self.web3.eth.contract(self.abi);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(self.class_defaults, tx_params);

        if (tx_params.data == null) {
          tx_params.data = self.binary;
        }

        // web3 0.9.0 and above calls new this callback twice.
        // Why, I have no idea...
        var intermediary = function(err, web3_instance) {
          if (err != null) {
            reject(err);
            return;
          }

          if (err == null && web3_instance != null && web3_instance.address != null) {
            accept(new self(web3_instance));
          }
        };

        args.push(tx_params, intermediary);
        contract_class.new.apply(contract_class, args);
      });
    });
  };

  Contract.at = function(address) {
    var self = this;

    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to " + this.binaries.contract_name + ".at(): " + address);
    }

    var contract = new this(address);

    // Add thennable to allow people opt into new recommended usage.
    contract.then = function(fn) {
      return self.detectNetwork().then(function(network_id) {
        var instance = new self(address);

        return new Promise(function(accept, reject) {
          self.web3.eth.getCode(address, function(err, code) {
            if (err) return reject(err);

            if (!code || new BigNumber(code).eq(0)) {
              return reject(new Error("Cannot create instance of " + self.contract_name + "; no code at address " + address));
            }

            accept(instance);
          });
        });
      }).then(fn);
    };

    return contract;
  };

  Contract.deployed = function() {
    var self = this;
    var contract = this.at(this.address);

    // Add thennable to allow people to opt into new recommended usage.
    contract.then = function(fn) {
      return self.detectNetwork().then(function(network_id) {
        if (!self.isDeployedToNetwork(network_id)) {
          throw new Error(self.contract_name + " has not been deployed to detected network: " + network_id);
        }
        return new self(self.address);
      }).then(fn);
    };

    return contract;
  };

  Contract.defaults = function(class_defaults) {
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
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.hasNetwork = function(network_id) {
    return this.binaries.networks[network_id] != null;
  };

  Contract.isDeployedToNetwork = function(network_id) {
    return this.binaries.networks[network_id] != null && this.binaries.networks[network_id].address != null;
  };

  Contract.detectNetwork = function() {
    var self = this;

    return new Promise(function(accept, reject) {
      if (this.network_id != null) {
        return accept(this.network_id);
      }

      self.web3.version.getNetwork(function(err, result) {
        if (err) return reject(err);

        var network_id = result.toString();

        // Only set the network if we have that network available.
        if (self.hasNetwork(network_id)) {
          self.setNetwork(network_id);
        }

        accept(network_id);
      });
    });
  };

  Contract.setNetwork = function(network_id) {
    if (!network_id) return;
    this.network_id = network_id + "";
  };

  Contract.networks = function() {
    return Object.keys(this.binaries.networks);
  };

  Contract.link = function(name, address) {
    var self = this;

    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      this.link(contract.contract_name, contract.address);

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

    this.network.links[name] = address;
  };

  Contract._property_values = {};
  Contract._addProp = function(key, fn) {
    var self = this;

    var writable = {
      "address": true
    };

    var getter = function() {
      return self._property_values[key] || fn.call(self);
    }
    var setter = function(val) {
      if (writable[key] !== true) {
        throw new Error(key + " property is immutable");
      }

      self._property_values[key] = val;
    };

    var definition = {};
    definition.enumerable = false;
    definition.configurable = false;
    definition.get = getter;
    definition.set = setter;

    Object.defineProperty(this, key, definition);
  };

  // Getter functions are scoped to Contract object.
  Contract._properties = {
    contract_name: function() {
      return this.binaries.contract_name;
    },
    abi: function() {
      return this.binaries.abi;
    },
    binaries: function() {
      return BINARIES;
    },
    network: function() {
      var network_id = this.network_id != null ? this.network_id : this.default_network;
      return this.binaries.networks[network_id] || {};
    },
    // Legacy option (deprecated)
    all_networks: function() {
      return this.binaries.networks;
    },
    address: function() {
      var address = this.network.address;

      if (address == null) {
        throw new Error("Cannot find deployed address: " + this.contract_name + " not deployed or address not set.");
      }

      return address;
    },
    links: function() {
      return this.network.links || {};
    },
    events: function() {
      return this.network.events || {};
    },
    binary: function() {
      var self = this;
      var binary = this.unlinked_binary;

      Object.keys(this.links).forEach(function(library_name) {
        var library_address = self.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    },
    unlinked_binary: function() {
      return this.binaries.unlinked_binary;
    },
    binary_version: function() {
      return this.binaries.generated_with;
    },
    generated_with: function() {
      return "{{PUDDING_VERSION}}";
    },
    default_network: function() {
      return this.binaries.default_network;
    },
    updated_at: function() {
      return this.binaries.updated_at;
    }
  };

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window[BINARIES.contract_name] = Contract;
  }
})();
