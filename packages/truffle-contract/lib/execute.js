var Web3PromiEvent = require('web3-core-promievent');
var utils = require("./utils");
var StatusError = require("./statuserror");
var handle = require("./handlers");

var execute = {

  _defaultGas: 90000,

  _setUpHandlers: function(emitter, context){
    emitter.on('error', handle.error.bind(emitter, context))
    emitter.on('transactionHash', handle.hash.bind(emitter, context))
    emitter.on('confirmation', handle.confirmation.bind(emitter, context))
    emitter.on('receipt', handle.receipt.bind(emitter, context));
  },

  _getGasEstimate: function(contract, self, params, blockLimit){
    return new Promise(function(accept, reject){
      // Always prefer specified gas
      if (params.gas) return accept(params.gas);

        contract.web3.eth.estimateGas(params).then(function(gas){
          var bestEstimate = Math.floor(self.__gasMultiplier * gas);

          // Don't go over blockLimit
          (bestEstimate >= blockLimit)
            ? accept(blockLimit - 1)
            : accept(bestEstimate);

        // We need to let tx's that revert through because often that's
        // exactly what you are testing.
        }).catch(function(err){
          accept(execute._defaultGas);
        });
    })
  },

  call: function(fn, C, inputs) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var params = {};
      var last_arg = args[args.length - 1];
      var defaultBlock;

      // It's only params if it's an object and not a BigNumber.
      // It's only defaultBlock if there's an extra non-object input that's not params.
      var hasTxParams = utils.is_object(last_arg) && !utils.is_big_number(last_arg);
      var hasDefaultBlock = !hasTxParams && args.length > inputs.length;
      var hasDefaultBlockWithParams = hasTxParams && args.length - 1 > inputs.length;

      // Detect and extract defaultBlock parameter
      if (hasDefaultBlock || hasDefaultBlockWithParams) {
          defaultBlock = args.pop();
      }
      // Get tx params
      if (hasTxParams) {
        params = args.pop();
      }

      params = utils.merge(C.class_defaults, params);

      return C.detectNetwork().then(function() {
        return fn(...args).call(params, defaultBlock);
      });
    };
  },

  send: function(fn, C, _self) {
    var self = _self;
    return function() {
      var result;
      var defaultGas = 90000;
      var args = Array.prototype.slice.call(arguments);
      var params = utils.getTxParams(args, C);
      var promiEvent = new Web3PromiEvent();

      var context = {
        contract: C,
        promiEvent: promiEvent,
        params: params
      }

      C.detectNetwork().then(function(id, blockLimit) {
        params.to = self.address;
        params.data = fn(...args).encodeABI();

        execute._getGasEstimate(C, self, params, blockLimit).then(function(gas){

          params.gas = gas
          result = C.web3.eth.sendTransaction(params);
          execute._setUpHandlers(result, context);

        }).catch(promiEvent.reject)
      }).catch(promiEvent.reject)

      return promiEvent.eventEmitter;
    };
  },

  sendTransaction : function(C, _self) {
    var self = _self;
    return function(params, callback){
      var promiEvent = new Web3PromiEvent();

      if (typeof params == "function") {
        callback = params;
        params = {};
      }

      params = utils.merge(C.class_defaults, params);
      params.to = self.address;

      if (callback !== undefined){
        return C.detectNetwork().then(function(){
          C.web3.eth.sendTransaction.apply(C.web3.eth, [params, callback]);
        })
      }

      var context = {
        contract: C,
        promiEvent: promiEvent,
        params: params
      }

      C.detectNetwork().then(function(id, blockLimit){
        execute._getGasEstimate(C, self, params, blockLimit).then(function(gas){

          params.gas = gas;
          var result = C.web3.eth.sendTransaction(params);
          execute._setUpHandlers(result, context);

        }).catch(promiEvent.reject)
      }).catch(promiEvent.reject)

      return promiEvent.eventEmitter;
    }
  },

  event: function(fn, C){
    return function(params, callback){
      var promiEvent = new Web3PromiEvent();
      var emitter = promiEvent.eventEmitter;

      if (typeof params == "function") {
        callback = params;
        params = {};
      }

      // As callback
      if (callback !== undefined){
        var intermediary = function(err, data){
          if (err) callback(err, data);

          var event = utils.decodeLogs(C, data, true)[0];
          callback(err, event);
        }

        return C.detectNetwork().then(function(){
         fn.apply(C.events, [params, intermediary]);
        })
      }

      // As event emitter
      C.detectNetwork().then(function() {
        var listener = fn(params)

        listener.on('data', function(data){
          var event = utils.decodeLogs(C, data, true)[0];
          emitter.emit('data', event);
        })

        listener.on('changed', function(data){
          var event = utils.decodeLogs(C, data, true)[0]
          emitter.emit('changed', event);
        })

        listener.on('error', function(error){
          emitter.emit('error', error);
        })

      // Emit the error if detect network fails --
      // actually what should we do here?
      }).catch(function(error){
        emitter.emit('error', error);
      });

      return emitter;
    };
  },

  estimate : function(fn, C){
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var params = utils.getTxParams(args, C);

      return C.detectNetwork().then(function() {
          return fn(...args).estimateGas(params);
      });
    };
  },

  request : function(fn, C){
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var params = utils.getTxParams(args, C);

      return C.detectNetwork().then(function() {
          return fn(...args).request(params);
      });
    };
  },

  // Network detection for `.new` happens
  // before invocation at `contract.js` where we check the libraries.
  deploy: function(args, context) {
    var self = this;
    var params = utils.getTxParams(args, self);

    var options = {
      data: self.binary,
      arguments: args
    };

    var contract = new self.web3.eth.Contract(self.abi);
    params.data = contract.deploy(options).encodeABI();
    var result = self.web3.eth.sendTransaction(params);
    execute._setUpHandlers(result, context);

    // Errors triggered by web3 are rejected at the `error` listener. Status
    // errors are rejected here.
    result.then(function(receipt){
      if (parseInt(receipt.status) == 0){
        var error = new StatusError(params, context.transactionHash, receipt);
        return context.promiEvent.reject(error)
      }

      var instance = new self.web3.eth.Contract(self.abi, receipt.contractAddress);
      instance.transactionHash = context.transactionHash;

      context.promiEvent.resolve(new self(instance));

    // TO DO: capture & ignore '50 blocks' timeout error.
    // All the event emitters & promise will go dead so we'll need
    // to replicate what web3 does here.
    }).catch(context.promiEvent.reject);
  },

  // This gets attached to `.new` (declared as a static_method in `contract`)
  // during bootstrapping as `estimate`
  estimateDeployment : function(){
    var self = this;
    var args = Array.prototype.slice.call(arguments);

    return self.detectNetwork().then(function() {
      var params = utils.getTxParams(args, self);

      var options = {
        data: self.binary,
        arguments: args
      };

      delete params['data'];

      var contract_class = new self.web3.eth.Contract(self.abi, params);

      return self.detectNetwork().then(function() {
        return contract_class.deploy(options).estimateGas(params)
      })
    });
  },
};

module.exports = execute;