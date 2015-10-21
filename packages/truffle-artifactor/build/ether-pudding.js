

"use strict";

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var factory = function factory(Promise, web3) {
  var Pudding = (function () {
    function Pudding(contract) {
      _classCallCheck(this, Pudding);

      if (!this.constructor.abi) {
        throw new Error("Contract ABI not set. Please inherit Pudding and set static .abi variable with contract abi.");
      }

      this.contract = contract;
      this.address = contract.address;

      if (!this.web3) {
        this.web3 = Pudding.web3;
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.constructor.abi[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var fn = _step.value;

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
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"]) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.allEvents = this.contract.allEvents;
    }

    //

    _createClass(Pudding, null, [{
      key: "new",
      value: function _new() {
        var _this = this;

        var args = Array.prototype.slice.call(arguments);

        if (!this.binary) {
          throw new Error("Contract binary not set. Please override Pudding and set .binary before calling new()");
        }

        var self = this;

        return new Promise(function (accept, reject) {
          var contract_class = _this.web3.eth.contract(_this.abi);
          var tx_params = {};

          if (_this.is_object(args[args.length - 1])) {
            tx_params = args.pop();
          }

          tx_params = _this.merge(Pudding.class_defaults, _this.class_defaults, tx_params);

          if (tx_params.data == null) {
            tx_params.data = _this.binary;
          }

          // web3 0.9.0 and above calls new twice this callback twice.
          // Why, I have no idea...
          var intermediary = function intermediary(err, web3_instance) {
            if (err != null) {
              reject(err);
              return;
            }

            if (err == null && web3_instance != null && web3_instance.address != null) {
              accept(new self(web3_instance));
            }
          };

          args.push(tx_params, intermediary);

          contract_class["new"].apply(contract_class, args);
        });
      }
    }, {
      key: "at",
      value: function at(address) {
        var contract_class = this.web3.eth.contract(this.abi);
        var contract = contract_class.at(address);
        return new this(contract);
      }
    }, {
      key: "deployed",
      value: function deployed() {
        if (!this.address) {
          throw new Error("Contract address not set - deployed() relies on the contract class having a static 'address' value; please set that before using deployed().");
        }

        return this.at(this.address);
      }

      // Backward compatibility.
    }, {
      key: "extend",
      value: function extend() {
        var args = Array.prototype.slice.call(arguments);

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = arguments[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var object = _step2.value;
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = Object.keys(object)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var key = _step3.value;

                var value = object[key];
                this.prototype[key] = value;
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3["return"]) {
                  _iterator3["return"]();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }

      // Backward compatibility.
    }, {
      key: "whisk",
      value: function whisk(abi, binary) {
        var defaults = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var Contract = (function (_ref) {
          _inherits(Contract, _ref);

          function Contract() {
            _classCallCheck(this, Contract);

            _get(Object.getPrototypeOf(Contract.prototype), "constructor", this).apply(this, arguments);
          }

          return Contract;
        })(this);

        ;
        Contract.abi = abi;
        Contract.binary = binary;
        Contract.class_defaults = defaults;
        return Contract;
      }
    }, {
      key: "defaults",
      value: function defaults(class_defaults) {
        if (this.class_defaults == null) {
          this.class_defaults = {};
        }

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = Object.keys(class_defaults)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var key = _step4.value;

            var value = class_defaults[key];
            this.class_defaults[key] = value;
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4["return"]) {
              _iterator4["return"]();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        return this.class_defaults;
      }
    }, {
      key: "setWeb3",
      value: function setWeb3(web3) {
        this.web3 = web3;
      }
    }, {
      key: "is_object",
      value: function is_object(val) {
        return typeof val == "object" && !(val instanceof Array);
      }
    }, {
      key: "merge",
      value: function merge() {
        var merged = {};
        var args = Array.prototype.slice.call(arguments);

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = args[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var object = _step5.value;
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
              for (var _iterator6 = Object.keys(object)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                var key = _step6.value;

                var value = object[key];
                merged[key] = value;
              }
            } catch (err) {
              _didIteratorError6 = true;
              _iteratorError6 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion6 && _iterator6["return"]) {
                  _iterator6["return"]();
                }
              } finally {
                if (_didIteratorError6) {
                  throw _iteratorError6;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5["return"]) {
              _iterator5["return"]();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        return merged;
      }
    }, {
      key: "promisifyFunction",
      value: function promisifyFunction(fn) {
        var self = this;
        return function () {
          var _this2 = this;

          var args = Array.prototype.slice.call(arguments);
          var tx_params = {};

          if (self.is_object(args[args.length - 1])) {
            tx_params = args.pop();
          }

          tx_params = self.merge(Pudding.class_defaults, self.class_defaults, tx_params);

          return new Promise(function (accept, reject) {
            var callback = function callback(error, result) {
              if (error != null) {
                reject(error);
              } else {
                accept(result);
              }
            };
            args.push(tx_params, callback);
            fn.apply(_this2.contract, args);
          });
        };
      }
    }, {
      key: "synchronizeFunction",
      value: function synchronizeFunction(fn) {
        var self = this;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var tx_params = {};

          if (self.is_object(args[args.length - 1])) {
            tx_params = args.pop();
          }

          tx_params = self.merge(Pudding.class_defaults, self.class_defaults, tx_params);

          return new Promise(function (accept, reject) {

            var callback = function callback(error, tx) {
              var interval = null;
              var max_attempts = 240;
              var attempts = 0;

              if (error != null) {
                reject(error);
                return;
              }

              var interval;

              var make_attempt = function make_attempt() {
                //console.log "Interval check //{attempts}..."
                self.web3.eth.getTransaction(tx, function (e, tx_info) {
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
            fn.apply(undefined, _toConsumableArray(args));
          });
        };
      }
    }, {
      key: "load",
      value: function load(factories, scope) {
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

        var names = [];

        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
          for (var _iterator7 = factories[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var factory = _step7.value;

            var result = factory(this);
            names.push(result.contract_name);
            scope[result.contract_name] = result;
          }
        } catch (err) {
          _didIteratorError7 = true;
          _iteratorError7 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion7 && _iterator7["return"]) {
              _iterator7["return"]();
            }
          } finally {
            if (_didIteratorError7) {
              throw _iteratorError7;
            }
          }
        }

        return names;
      }
    }]);

    return Pudding;
  })();

  ; // end class

  Pudding.class_defaults = {};
  Pudding.version = "0.13.3";

  return Pudding;
};

if (typeof module != "undefined") {
  module.exports = factory(require("bluebird"));
} else {
  // We expect Promise to already be included.
  window.Pudding = factory(Promise);
}