var Pudding =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var Promise = __webpack_require__(1);
	var pkg = __webpack_require__(2);

	function Pudding(contract) {
	  if (!this.abi) {
	    throw new Error("Contract ABI not set. Please inherit Pudding and set static .abi variable with contract abi.");
	  }

	  this.contract = contract;
	  this.address = contract.address;

	  for (var i = 0; i < this.abi.length; i++) {
	    var fn = this.abi[i];
	    if (fn.type == "function") {
	      if (fn.constant == true) {
	        this[fn.name] = this.constructor.promisifyFunction(this.contract[fn.name]);
	      } else {
	        this[fn.name] = this.constructor.synchronizeFunction(this.contract[fn.name]);
	      }

	      this[fn.name].call = this.constructor.promisifyFunction(this.contract[fn.name].call);
	      this[fn.name].sendTransaction = this.constructor.promisifyFunction(this.contract[fn.name].sendTransaction);
	      this[fn.name].request = this.contract[fn.name].request;
	    }

	    if (fn.type == "event") {
	      this[fn.name] = this.contract[fn.name];
	    }
	  }

	  this.allEvents = this.contract.allEvents;
	};

	Pudding.new = function() {
	  var args = Array.prototype.slice.call(arguments);
	  var web3 = Pudding.getWeb3();

	  if (!this.prototype.binary) {
	    throw new Error("Contract binary not set. Please override Pudding and set .binary before calling new()");
	  }

	  var self = this;

	  return new Promise(function(accept, reject) {
	    var contract_class = web3.eth.contract(self.prototype.abi);
	    var tx_params = {};
	    var last_arg = args[args.length - 1];

	    // It's only tx_params if it's an object and not a BigNumber.
	    if (Pudding.is_object(last_arg) && last_arg instanceof Pudding.BigNumber == false) {
	      tx_params = args.pop();
	    }

	    tx_params = Pudding.merge(Pudding.class_defaults, self.prototype.class_defaults, tx_params);

	    if (tx_params.data == null) {
	      tx_params.data = self.prototype.binary;
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

	Pudding.at = function(address) {
	  var web3 = Pudding.getWeb3();
	  var contract_class = web3.eth.contract(this.prototype.abi);
	  var contract = contract_class.at(address);

	  return new this(contract);
	};

	Pudding.deployed = function() {
	  if (!this.prototype.address) {
	    throw new Error("Contract address not set - deployed() relies on the contract class having a static 'address' value; please set that before using deployed().");
	  }

	  return this.at(this.prototype.address);
	};

	Pudding.extend = function() {
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

	Pudding.whisk = function(data, constructor) {
	  if (this.web3 == null) {
	    throw new Error("Please call Pudding.setWeb3() before calling Pudding.whisk().");
	  }

	  var Contract = constructor;

	  if (constructor == null) {
	    Contract = function(contract) {
	      Pudding.apply(this, arguments);
	    };
	  }

	  Contract.prototype = Object.create(Pudding.prototype);

	  Contract.abi = Contract.prototype.abi = data.abi;
	  Contract.binary = Contract.prototype.binary = data.binary;
	  Contract.unlinked_binary = Contract.prototype.unlinked_binary = data.unlinked_binary || data.binary;
	  Contract.prototype.class_defaults = data.defaults || {};
	  Contract.address = Contract.prototype.address = data.address;
	  Contract.deployed_address = Contract.prototype.deployed_address = data.address; // deprecated
	  Contract.generated_with = Contract.prototype.generated_with = data.generated_with;
	  Contract.contract_name = Contract.prototype.contract_name = data.contract_name;

	  // Post-whisked loads just return the contract.
	  Contract.load = function() {
	    return Contract;
	  };

	  Contract.new = Pudding.new.bind(Contract);
	  Contract.at = Pudding.at.bind(Contract);
	  Contract.deployed = Pudding.deployed.bind(Contract);
	  Contract.extend = Pudding.extend.bind(Contract);

	  return Contract;
	}

	Pudding.load = function(factories, scope) {
	  if (scope == null) {
	    scope = {};
	  }

	  if (!(factories instanceof Array)) {
	    factories = [factories];
	  }

	  var names = [];

	  for (var i = 0; i < factories.length; i++) {
	    var factory = factories[i];
	    var result = factory.load(this);
	    names.push(result.contract_name);
	    scope[result.contract_name] = result;
	  }

	  return names;
	};

	Pudding.defaults = function(class_defaults) {
	  if (this.class_defaults == null) {
	    this.class_defaults = {};
	  }

	  if (class_defaults == null) {
	    class_defaults = {};
	  }

	  var keys = Object.keys(class_defaults);
	  for (var i = 0; i < keys.length; i++) {
	    var key = keys[i];
	    var value = class_defaults[key];
	    this.class_defaults[key] = value;
	  }
	  return this.class_defaults;
	}

	Pudding.setWeb3 = function(web3) {
	  this.web3 = web3;

	  if (this.web3.toBigNumber == null) {
	    throw new Error("Pudding.setWeb3() must be passed an instance of Web3 and not Web3 itself.");
	  }

	  this.BigNumber = this.web3.toBigNumber(0).constructor;
	};

	Pudding.getWeb3 = function() {
	  return this.web3 || Pudding.web3; // Note: Pudding often times === this;
	}

	Pudding.is_object = function(val) {
	  return typeof val == "object" && !(val instanceof Array);
	};

	Pudding.merge = function() {
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
	};

	Pudding.promisifyFunction = function(fn) {
	  var self = this;
	  return function() {
	    var instance = this;

	    var args = Array.prototype.slice.call(arguments);
	    var tx_params = {};
	    var last_arg = args[args.length - 1];

	    // It's only tx_params if it's an object and not a BigNumber.
	    if (Pudding.is_object(last_arg) && last_arg instanceof Pudding.BigNumber == false) {
	      tx_params = args.pop();
	    }

	    tx_params = Pudding.merge(Pudding.class_defaults, self.class_defaults, tx_params);

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
	};

	Pudding.synchronizeFunction = function(fn) {
	  var self = this;
	  var web3 = Pudding.getWeb3();
	  return function() {
	    var args = Array.prototype.slice.call(arguments);
	    var tx_params = {};
	    var last_arg = args[args.length - 1];

	    // It's only tx_params if it's an object and not a BigNumber.
	    if (Pudding.is_object(last_arg) && last_arg instanceof Pudding.BigNumber == false) {
	      tx_params = args.pop();
	    }

	    tx_params = Pudding.merge(Pudding.class_defaults, self.class_defaults, tx_params);

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
	};

	Pudding.class_defaults = {};
	Pudding.version = pkg.version;

	module.exports = Pudding;


/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = Promise;

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = {
		"name": "ether-pudding",
		"version": "2.0.3",
		"description": "Pudding - a (more) delightful Ethereum contract abstraction",
		"author": "Tim Coulter",
		"main": "./index.js",
		"private": false,
		"scripts": {
			"test": "./node_modules/.bin/mocha"
		},
		"repository": {
			"type": "git",
			"url": "https://github.com/consensys/ether-pudding.git"
		},
		"license": "MIT License. Copyright Consensys LLC, and authors. All rights reserved.",
		"devDependencies": {
			"chai": "^3.4.1",
			"ethereumjs-testrpc": "^0.1.1",
			"json-loader": "^0.5.4",
			"mocha": "^2.3.4",
			"solc": "^0.1.6",
			"temp": "^0.8.3",
			"web3": "^0.15.1",
			"webpack": "^1.12.11"
		},
		"dependencies": {
			"bluebird": "^3.1.5",
			"node-dir": "^0.1.11"
		}
	};

/***/ }
/******/ ]);