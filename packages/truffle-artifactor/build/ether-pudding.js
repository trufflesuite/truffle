

(function() {
  var factory;

  factory = function(Promise, web3) {
    var Pudding;
    Pudding = (function() {
      function Pudding() {}

      Pudding.global_defaults = {};

      Pudding.whisk = function(abi, binary, class_defaults) {
        var code, contract;
        if (typeof binary === "object") {
          class_defaults = binary;
          code = null;
        }
        contract = web3.eth.contract(abi);
        contract.binary = binary;
        contract = this.add_helpers(contract);
        contract = this.inject_defaults(contract, class_defaults);
        contract = this.synchronize_contract(contract);
        contract = this.make_nicer_new(contract, binary);
        if (Promise != null) {
          contract = this.promisify_contract(contract);
        }
        return contract;
      };

      Pudding.defaults = function(new_global_defaults) {
        var key, value;
        if (new_global_defaults == null) {
          new_global_defaults = {};
        }
        for (key in new_global_defaults) {
          value = new_global_defaults[key];
          Pudding.global_defaults[key] = value;
        }
        return Pudding.global_defaults;
      };

      Pudding.merge = function() {
        var i, key, len, merged, object, value;
        merged = {};
        for (i = 0, len = arguments.length; i < len; i++) {
          object = arguments[i];
          for (key in object) {
            value = object[key];
            merged[key] = value;
          }
        }
        return merged;
      };

      Pudding.extend = function() {
        var args, i, key, len, obj, object, value;
        args = Array.prototype.slice.call(arguments);
        obj = args.shift();
        for (i = 0, len = arguments.length; i < len; i++) {
          object = arguments[i];
          for (key in object) {
            value = object[key];
            obj[key] = value;
          }
        }
        return obj;
      };

      Pudding.is_object = function(val) {
        return typeof val === "object" && !(val instanceof Array);
      };

      Pudding.apply_extensions = function(contract_class, instance) {
        this.extend(instance, contract_class._extended);
        return instance;
      };

      Pudding.add_helpers = function(contract_class) {
        var old_at, old_new;
        contract_class._extended = {};
        contract_class.extend = function() {
          var args;
          args = Array.prototype.slice.call(arguments);
          args.unshift(contract_class._extended);
          return Pudding.extend.apply(null, args);
        };
        old_at = contract_class.at;
        old_new = contract_class["new"];
        contract_class.at = function(address) {
          var instance;
          instance = old_at.call(contract_class, address);
          return Pudding.apply_extensions(contract_class, instance);
        };
        return contract_class;
      };

      Pudding.inject_defaults = function(contract_class, class_defaults) {
        var inject, old_at, old_new;
        old_at = contract_class.at;
        old_new = contract_class["new"];
        inject = (function(_this) {
          return function(instance, instance_defaults) {
            var abi_object, fn, fn_name, i, key, len, merged_defaults, ref, value;
            if (instance_defaults == null) {
              instance_defaults = {};
            }
            merged_defaults = _this.merge(class_defaults, instance_defaults);
            ref = contract_class.abi;
            for (i = 0, len = ref.length; i < len; i++) {
              abi_object = ref[i];
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
        })(this);
        contract_class.at = function(address, instance_defaults) {
          var instance;
          if (instance_defaults == null) {
            instance_defaults = {};
          }
          instance = old_at.call(contract_class, address);
          return inject(instance, instance_defaults);
        };
        contract_class["new"] = (function(_this) {
          return function() {
            var args, callback, instance_defaults, tx_params;
            args = Array.prototype.slice.call(arguments);
            callback = args.pop();
            if (_this.is_object(args[args.length - 1]) && _this.is_object(args[args.length - 2])) {
              instance_defaults = args.pop();
              tx_params = args.pop();
            } else {
              instance_defaults = {};
              if (_this.is_object(args[args.length - 1])) {
                tx_params = args.pop();
              } else {
                tx_params = {};
              }
            }
            tx_params = _this.merge(Pudding.global_defaults, class_defaults, tx_params);
            args.push(tx_params, function(err, instance) {
              if (err != null) {
                callback(err);
                return;
              }
              return callback(null, inject(instance));
            });
            return old_new.apply(contract_class, args);
          };
        })(this);
        return contract_class;
      };

      Pudding.inject_defaults_into_function = function(instance, fn, merged_defaults) {
        return (function(_this) {
          return function() {
            var args, callback, old_options, options;
            args = Array.prototype.slice.call(arguments);
            callback = args.pop();
            options = _this.merge(Pudding.global_defaults, merged_defaults);
            if (_this.is_object(args[args.length - 1])) {
              old_options = args.pop();
              options = _this.merge(options, old_options);
            }
            args.push(options, callback);
            return fn.apply(instance, args);
          };
        })(this);
      };

      Pudding.promisify_contract = function(contract_class) {
        var old_at, old_new, promisify;
        old_at = contract_class.at;
        old_new = contract_class["new"];
        promisify = function(instance) {
          var fn, i, item, k, key, len, ref, v;
          ref = contract_class.abi;
          for (i = 0, len = ref.length; i < len; i++) {
            item = ref[i];
            if (item.type !== "function") {
              continue;
            }
            key = item.name;
            fn = instance[key];
            for (k in fn) {
              v = fn[k];
              if (typeof fn !== "object" && typeof fn !== "function") {
                continue;
              }
              if (k === "request") {
                continue;
              }
              if (k === "estimateGas") {
                continue;
              }
              fn[k] = Promise.promisify(v, instance);
            }
            instance[key] = Promise.promisify(fn, instance);
          }
          return instance;
        };
        contract_class.at = function(address, instance_defaults) {
          var instance;
          if (instance_defaults == null) {
            instance_defaults = {};
          }
          instance = old_at.call(contract_class, address, instance_defaults);
          return promisify(instance);
        };
        contract_class["new"] = Promise.promisify(function() {
          var args, callback;
          args = Array.prototype.slice.call(arguments);
          callback = args.pop();
          args.push(function(err, instance) {
            if (err != null) {
              callback(err);
              return;
            }
            return callback(null, promisify(instance));
          });
          return old_new.apply(contract_class, args);
        });
        return contract_class;
      };

      Pudding.make_nicer_new = function(contract_class, code) {
        var old_new;
        if (code == null) {
          code = "";
        }
        old_new = contract_class["new"];
        contract_class["new"] = (function(_this) {
          return function() {
            var args, callback, found_error, instance_defaults, intermediary, tx_params;
            args = Array.prototype.slice.call(arguments);
            callback = args.pop();
            if (_this.is_object(args[args.length - 1]) && _this.is_object(args[args.length - 2])) {
              instance_defaults = args.pop();
              tx_params = args.pop();
            } else {
              instance_defaults = {};
              if (_this.is_object(args[args.length - 1])) {
                tx_params = args.pop();
              } else {
                tx_params = {};
              }
            }
            if (tx_params.data == null) {
              tx_params.data = code;
            }
            found_error = null;
            intermediary = function(err, created_instance) {
              if ((found_error == null) && (err != null)) {
                found_error = err;
                callback(found_error);
                return;
              }
              if ((found_error == null) && (err == null) && (created_instance != null) && (created_instance.address != null)) {
                created_instance = Pudding.apply_extensions(contract_class, created_instance);
                return callback(null, created_instance);
              }
            };
            args.push(tx_params, instance_defaults, intermediary);
            return old_new.apply(contract_class, args);
          };
        })(this);
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
        var old_at, old_new, synchronize;
        old_at = contract_class.at;
        old_new = contract_class["new"];
        synchronize = function(instance) {
          var abi_object, fn, fn_name, i, key, len, ref, value;
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
        contract_class.at = function(address, instance_defaults) {
          var instance;
          if (instance_defaults == null) {
            instance_defaults = {};
          }
          instance = old_at.call(contract_class, address, instance_defaults);
          return synchronize(instance);
        };
        contract_class["new"] = function() {
          var args, callback;
          args = Array.prototype.slice.call(arguments);
          callback = args.pop();
          args.push(function(err, instance) {
            if (err != null) {
              callback(err);
              return;
            }
            return callback(null, synchronize(instance));
          });
          return old_new.apply(contract_class, args);
        };
        return contract_class;
      };

      return Pudding;

    })();
    return Pudding;
  };

  if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
    module.exports = factory(require("bluebird"), web3 || require("web3"));
  } else {
    window.Pudding = factory(Promise, web3);
  }

}).call(this);
