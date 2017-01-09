var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

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

  function bootstrap(fn) {
    // Add our static methods
    Object.keys(fn._static_methods).forEach(function(key) {
      fn[key] = fn._static_methods[key].bind(fn);
    });

    // Add our properties.
    Object.keys(fn._properties).forEach(function(key) {
      fn.addProp(key, fn._properties[key]);
    });

    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract(contract) {
    var constructor = this.constructor;
    this.abi = constructor.abi;

    if (typeof contract == "string") {
      var address = contract;
      var contract_class = constructor.web3.eth.contract(this.abi);
      contract = contract_class.at(address);
    }

    this.contract = contract;

    // Provision our functions.
    for (var i = 0; i < this.abi.length; i++) {
      var item = this.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          this[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          this[item.name] = Utils.synchronizeFunction(contract[item.name], this, constructor);
        }

        this[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        this[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        this[item.name].request = contract[item.name].request;
        this[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        this[item.name] = contract[item.name];
      }
    }

    this.allEvents = contract.allEvents;
    this.address = contract.address;
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
        throw new Error(this.contract_name + " error: Please call setProvider() first before calling new().");
      }

      var args = Array.prototype.slice.call(arguments);

      if (!this.unlinked_binary) {
        throw new Error(this._binaries.contract_name + " error: contract binary not set. Can't deploy new instance.");
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

          throw new Error(self.contract_name + " contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of " + self.binaries.contract_name + ": " + unlinked_libraries);
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
    },

    at: function(address) {
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
    },

    deployed: function() {
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

    extend: function() {
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
    },

    hasNetwork: function(network_id) {
      return this.binaries.networks[network_id + ""] != null;
    },

    isDeployed: function() {
      return !!this.network.address;
    },

    isDeployedToNetwork: function(network_id) {
      return this.binaries.networks[network_id] != null && this.binaries.networks[network_id].address != null;
    },

    detectNetwork: function() {
      var self = this;

      return new Promise(function(accept, reject) {
        if (self.network_id != null) {
          return accept(self.network_id);
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
    },

    setNetwork: function(network_id) {
      if (!network_id) return;
      this.network_id = network_id + "";
    },

    networks: function() {
      return Object.keys(this.binaries.networks);
    },

    link: function(name, address) {
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
    },

    clone: function(options) {
      var self = this;
      var temp = function TruffleContract() {
        this.constructor = temp;
        return Contract.apply(this, arguments);
      };

      var binaries = options;
      var network_id;

      if (typeof options != "object") {
        binaries = self._binaries;
        network_id = options;
      }

      temp.prototype = Object.create(self.prototype);

      temp._static_methods = this._static_methods;
      temp._properties = this._properties;

      temp._property_values = {};
      temp._binaries = binaries || {};

      bootstrap(temp);

      temp.web3 = new Web3();
      temp.class_defaults = temp.prototype.defaults || {};

      if (network_id) {
        temp.setNetwork(network_id);
      }

      return temp;
    },

    addProp: function(key, fn) {
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
    }
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
      return this._binaries;
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
    schema_version: function() {
      return this.binaries.schema_version;
    },
    default_network: function() {
      return this.binaries.default_network;
    },
    updated_at: function() {
      return this.network.updated_at;
    }
  };

  bootstrap(Contract);

  module.exports = Contract;
})();
