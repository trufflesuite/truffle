var factory = function(Promise, web3) {

  class Pudding {
    constructor(contract) {
      if (!this.constructor.abi) {
        throw new Error("Contract ABI not set. Please inherit Pudding and set static .abi variable with contract abi.");
      }

      this.contract = contract;
      this.address = contract.address;

      if (!this.web3) {
        this.web3 = Pudding.web3;
      }

      for (var fn of this.constructor.abi) {
        if (fn.type == "function") {
          this[fn.name] = this.constructor.synchronizeFunction(this.contract[fn.name]);
          this[fn.name].call = this.constructor.promisifyFunction(this.contract[fn.name].call);
          this[fn.name].sendTransaction = this.constructor.promisifyFunction(this.contract[fn.name].sendTransaction);
          this[fn.name].request = this.contract[fn.name].request;
        }

        if (fn.type == "event") {
          this[fn.name] = this.contract[fn.name];
        }
      }
    }

    //
    static new() {
      var args = Array.prototype.slice.call(arguments);

      if (!this.binary) {
        throw new Error("Contract binary not set. Please override Pudding and set .binary before calling new()");
      }

      var self = this;

      return new Promise((accept, reject) => {
        var contract_class = this.web3.eth.contract(this.abi);
        var tx_params = {};

        if (this.is_object(args[args.length - 1])) {
          tx_params = args.pop();
        }

        tx_params = this.merge(Pudding.class_defaults, this.class_defaults, tx_params);

        if (tx_params.data == null) {
          tx_params.data = this.binary;
        }

        // web3 0.9.0 and above calls new twice this callback twice.
        // Why, I have no idea...
        var intermediary = (err, web3_instance) => {
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
    }

    static at(address) {
      var contract_class = this.web3.eth.contract(this.abi);
      var contract = contract_class.at(address);
      return new this(contract);
    }

    static deployed() {
      if (!this.address) {
        throw new Error("Contract address not set - deployed() relies on the contract class having a static 'address' value; please set that before using deployed().");
      }

      return this.at(this.address);
    }

    // Backward compatibility.
    static extend() {
      var args = Array.prototype.slice.call(arguments);

      for (var object of arguments) {
        for (var key of Object.keys(object)) {
          var value = object[key];
          this.prototype[key] = value;
        }
      }
    }

    // Backward compatibility.
    static whisk(abi, binary, defaults={}) {
      class Contract extends Pudding {};
      Contract.abi = abi;
      Contract.binary = binary;
      Contract.class_defaults = defaults;
      return Contract;
    }

    static defaults(class_defaults) {
      if (this.class_defaults == null) {
        this.class_defaults = {};
      }

      for (var key of Object.keys(class_defaults)) {
        var value = class_defaults[key];
        this.class_defaults[key] = value;
      }
      return this.class_defaults;
    }

    static setWeb3(web3) {
      this.web3 = web3;
    }

    static is_object(val) {
      return typeof val == "object" && !(val instanceof Array);
    }

    static merge() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var object of args) {
        for (var key of Object.keys(object)) {
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    }

    static promisifyFunction(fn) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};

        if (self.is_object(args[args.length - 1])) {
          tx_params = args.pop();
        }

        tx_params = self.merge(Pudding.class_defaults, self.class_defaults, tx_params);

        return new Promise((accept, reject) => {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(this.contract, args);
        });
      };
    }

    static synchronizeFunction(fn) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};

        if (self.is_object(args[args.length - 1])) {
          tx_params = args.pop();
        }

        tx_params = self.merge(Pudding.class_defaults, self.class_defaults, tx_params);

        return new Promise((accept, reject) => {

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
              self.web3.eth.getTransaction(tx, function(e, tx_info) {
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
                  reject(new Error(`Transaction ${tx} wasn't processed in ${attempts} attempts!`));
                }

                attempts += 1;
              });
            };

            interval = setInterval(make_attempt, 1000);
            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(this.contract, args);
        });
      };
    }

    static load(factories, scope) {
      // Use the global scope if none specified.
      if (scope == null) {
        if (typeof module == "undefined") {
          scope = window;
        } else {
          scope = global;
        }
      }

      if (!(factories instanceof Array)) {
        factories = [factories];
      }

      for (var factory of factories) {
        var result = factory(this);
        scope[result.contract_name] = result;
      }
    }

  }; // end class

  Pudding.class_defaults = {};
  Pudding.version = "{{VERSION}}";

  return Pudding;
};

if (typeof module != "undefined") {
  module.exports = factory(require("bluebird"));
} else {
  // We expect Promise to already be included.
  window.Pudding = factory(Promise);
}
