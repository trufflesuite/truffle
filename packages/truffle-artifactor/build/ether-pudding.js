(function() {
  var factory;

  factory = function(Promise, web3) {
    var Pudding;
    Pudding = (function() {
      function Pudding() {}

      Pudding.global_defaults = {};

      Pudding.recipe = function(abi, class_defaults) {
        var contract;
        contract = web3.eth.contract(abi);
        contract = Pudding.inject_defaults(contract, class_defaults);
        contract = Pudding.synchronize_contract(contract);
        if (Promise != null) {
          contract = Pudding.promisify_contract(contract);
        }
        return contract;
      };

      Pudding.defaults = function(new_global_defaults) {
        var i, key, len, value;
        if (new_global_defaults == null) {
          new_global_defaults = {};
        }
        for (value = i = 0, len = new_global_defaults.length; i < len; value = ++i) {
          key = new_global_defaults[value];
          this.global_defaults[key] = value;
        }
        return this.global_defaults;
      };

      Pudding.inject_defaults = function(contract_class, class_defaults) {
        var old_at;
        old_at = contract_class.at;
        contract_class.at = function(address, instance_defaults) {
          var abi_object, fn, fn_name, i, instance, key, len, merged_defaults, ref, ref1, value;
          instance = old_at.call(contract_class, address);
          merged_defaults = {};
          ref = this.global_defaults;
          for (key in ref) {
            value = ref[key];
            defaults[key] = value;
          }
          for (key in class_defaults) {
            value = class_defaults[key];
            defaults[key] = value;
          }
          for (key in instance_defaults) {
            value = instance_defaults[key];
            defaults[key] = value;
          }
          ref1 = contract_class.abi;
          for (i = 0, len = ref1.length; i < len; i++) {
            abi_object = ref1[i];
            fn_name = abi_object.name;
            fn = instance[fn_name];
            if (fn == null) {
              continue;
            }
            instance[fn_name] = Pudding.inject_defaults_into_function(instance, fn, merged_defaults);
            for (key in fn) {
              value = fn[key];
              instance[fn_name][key] = value;
            }
            instance[fn_name].sendTransaction = Pudding.inject_defaults_into_function(instance, fn.sendTransaction, merged_defaults);
            instance[fn_name].call = Pudding.inject_defaults_into_function(instance, fn.call, merged_defaults);
          }
          return instance;
        };
        return contract_class;
      };

      Pudding.inject_defaults_into_function = function(instance, fn, merged_defaults) {
        return function() {
          var args, callback, key, old_options, options, value;
          args = Array.prototype.slice.call(arguments);
          callback = args.pop();
          options = {};
          for (key in merged_defaults) {
            value = merged_defaults[key];
            options[key] = value;
          }
          if (typeof args[args.length - 1] === "object") {
            old_options = args.pop();
            for (key in old_options) {
              value = old_options[key];
              options[key] = value;
            }
          }
          args.push(options, callback);
          return fn.apply(instance, args);
        };
      };

      Pudding.promisify_contract = function(contract_class) {
        var old_at;
        old_at = contract_class.at;
        contract_class.at = function(address) {
          var fn, instance, k, key, v;
          instance = old_at.call(contract_class, address);
          for (key in instance) {
            fn = instance[key];
            if (typeof fn !== "object" && typeof fn !== "function") {
              continue;
            }
            for (k in fn) {
              v = fn[k];
              if (typeof fn !== "object" && typeof fn !== "function") {
                continue;
              }
              fn[k] = Promise.promisify(v, instance);
            }
            instance[key] = Promise.promisify(fn, instance);
          }
          return instance;
        };
        return contract_class;
      };

      Pudding.synchronize_function = function(instance, fn) {
        var attempts, interval, max_attempts;
        interval = null;
        max_attempts = 240;
        attempts = 0;
        return function() {
          var args, callback, new_callback;
          args = Array.prototype.slice.call(arguments);
          callback = args.pop();
          new_callback = function(error, response) {
            var make_attempt, tx;
            if (error != null) {
              callback(error, response);
              return;
            }
            tx = response;
            interval = null;
            make_attempt = function() {
              return web3.eth.getTransaction(tx, function(e, tx_info) {
                if (e != null) {
                  return;
                }
                if (tx_info.blockHash != null) {
                  clearInterval(interval);
                  callback(null, tx);
                }
                if (attempts >= max_attempts) {
                  clearInterval(interval);
                  callback("Transaction " + tx + " wasn't processed in " + attempts + " attempts!", tx);
                }
                return attempts += 1;
              });
            };
            interval = setInterval(make_attempt, 1000);
            return make_attempt();
          };
          args.push(new_callback);
          return fn.apply(instance, args);
        };
      };

      Pudding.synchronize_contract = function(contract_class) {
        var old_at;
        old_at = contract_class.at;
        contract_class.at = function(address) {
          var abi_object, fn, fn_name, i, instance, key, len, ref, value;
          instance = old_at.call(contract_class, address);
          ref = contract_class.abi;
          for (i = 0, len = ref.length; i < len; i++) {
            abi_object = ref[i];
            fn_name = abi_object.name;
            fn = instance[fn_name];
            if (fn == null) {
              continue;
            }
            instance[fn_name] = Pudding.synchronize_function(instance, fn);
            for (key in fn) {
              value = fn[key];
              instance[fn_name][key] = value;
            }
          }
          return instance;
        };
        return contract_class;
      };

      return Pudding;

    })();
    return Pudding;
  };

  if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
    module.exports = factory(require("bluebird"), require("web3"));
  } else {
    window.Pudding = factory(Promise, web3);
  }

}).call(this);
