var Web3 = require("web3");

(function() {
  var web3 = new Web3();
  var BigNumber = web3.toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !(val instanceof Array);
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
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && last_arg instanceof BigNumber == false) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

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
      };
    },
    synchronizeFunction: function(fn, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && last_arg instanceof BigNumber == false) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var callback = function(error, tx) {
            var interval = null;
            var max_attempts = 240;
            var attempts = 0;

            if (error != null) {
              reject(error);
              return;
            }

            var interval;

            var make_attempt = function() {
              //console.log "Interval check //{attempts}..."
              web3.eth.getTransaction(tx, function(e, tx_info) {
                // If there's an error ignore it.
                if (e != null) {
                  return;
                }

                if (tx_info.blockHash != null) {
                  clearInterval(interval);
                  accept(tx);
                }

                if (attempts >= max_attempts) {
                  clearInterval(interval);
                  reject(new Error("Transaction " + tx + " wasn't processed in " + attempts + " attempts!"));
                }

                attempts += 1;
              });
            };

            interval = setInterval(make_attempt, 1000);
            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  // Accepts a contract object created with web3.eth.contract.
  function Contract(contract) {
    this.contract = contract;

    // Provision our functions.
    for (var i = 0; i < this.abi.length; i++) {
      var item = this.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          this[item.name] = Utils.promisifyFunction(contract[item.name], Contract);
        } else {
          this[item.name] = Utils.synchronizeFunction(contract[item.name], Contract);
        }

        this[item.name].call = Utils.promisifyFunction(contract[item.name].call, Contract);
        this[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, Contract);
        this[item.name].request = contract[item.name].request;
        this[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, Contract);
      }

      if (item.type == "event") {
        this[item.name] = contract[item.name];
      }
    }

    this.allEvents = contract.allEvents;
    this.address = contract.address;
  };

  Contract.web3 = web3;
  Contract.provider = null;

  Contract.setProvider = function(provider) {
    Contract.web3.setProvider(provider);
    Contract.provider = provider;
  };

  Contract.new = function() {
    if (Contract.provider == null) {
      throw new Error("{{NAME}} error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!Contract.binary) {
      throw new Error("{{NAME}} error: contract binary not set. Can't deploy new instance.");
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = Contract.web3.eth.contract(self.prototype.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && last_arg instanceof BigNumber == false) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(Contract.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
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
  };

  Contract.at = function(address) {
    var contract_class = Contract.web3.eth.contract(Contract.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!Contract.address) {
      throw new Error("Contract address not set - deployed() relies on the contract class having a static 'address' value; please set that before using deployed().");
    }

    return Contract.at(this.prototype.address);
  };

  Contract.defaults = function(class_defaults) {
    if (Contract.class_defaults == null) {
      Contract.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      Contract.class_defaults[key] = value;
    });

    return Contract.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        Contract.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {{ALL_NETWORKS}};

  Contract.checkNetwork = function(callback) {
    if (Contract.current_network_id != null) {
      return callback();
    }

    Contract.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (Contract.all_networks[network_id] == null) {
        return callback(new Error(Contract.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      Contract.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = Contract.all_networks[network_id];

    Contract.abi             = Contract.prototype.abi             = network.abi;
    Contract.binary          = Contract.prototype.binary          = network.binary;
    Contract.unlinked_binary = Contract.prototype.unlinked_binary = network.unlinked_binary;
    Contract.address         = Contract.prototype.address         = network.address;

    if (Contract.unlinked_binary == "") {
      Contract.unlinked_binary = Contract.binary;
    }

    Contract.current_network_id = network_id;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "{{NAME}}";
  Contract.generated_with  = Contract.prototype.generated_with  = "{{PUDDING_VERSION}}";
  Contract.class_defaults  = Contract.prototype.defaults || {};

  // Set the network iniitally to make default data available and re-use code.
  // Then remove the saved network id so the network will be auto-detected on first use.
  Contract.setNetwork("default");
  Contract.current_network_id = null;

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.{{NAME}} = Contract;
  }
})();
