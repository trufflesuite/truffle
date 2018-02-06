var utils = require("./utils");
var handle = require("./handlers");
var Web3PromiEvent = require('web3-core-promievent');

var execute = {

  call: function(fn, C, inputs) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var tx_params = {};
      var last_arg = args[args.length - 1];
      var defaultBlock;

      // It's only tx_params if it's an object and not a BigNumber.
      // It's only defaultBlock if there's an extra non-object input that's not tx_params.
      var hasTxParams = utils.is_object(last_arg) && !utils.is_big_number(last_arg);
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

      tx_params = utils.merge(C.class_defaults, tx_params);

      // Overcomplicated
      return C.detectNetwork().then(function() {
        return (defaultBlock !== undefined)
          ? fn(...args).call(tx_params, defaultBlock)
          : fn(...args).call(tx_params);
      });
    };
  },

  send: function(fn, instance, C) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var tx_params = utils.getTxParams(args, C);
      var promiEvent = new Web3PromiEvent();

      var context = {
        contract: C,
        promiEvent: promiEvent,
        tx_params: tx_params
      }

      // .then never resolves here if emitters are attached, so
      // we're just resolving our own PromiEvent in the receipt handler.
      C.detectNetwork().then(function() {
        var listener = fn(...args).send(tx_params);

        listener.on('error', handle.error.bind(instance, context))
        listener.on('transactionHash', handle.hash.bind(instance, context))
        listener.on('confirmation', handle.confirmation.bind(instance, context))
        listener.on('receipt', handle.receipt.bind(instance, context));

      }).catch(promiEvent.reject);

      return promiEvent.eventEmitter;
    };
  },

  sendTransaction : function(C, _self) {
    var self = _self;
    return function(tx_params, callback){
      var promiEvent = new Web3PromiEvent();

      if (typeof tx_params == "function") {
        callback = tx_params;
        tx_params = {};
      }

      tx_params = utils.merge(C.class_defaults, tx_params);
      tx_params.to = self.address;

      if (callback !== undefined){
        return C.detectNetwork().then(function(){
          C.web3.eth.sendTransaction.apply(C.web3.eth, [tx_params, callback]);
        })
      }

      var context = {
        contract: C,
        promiEvent: promiEvent,
        tx_params: tx_params
      }

      // .then never resolves here if emitters are attached, so
      // we're just resolving our own PromiEvent in the receipt handler.
      C.detectNetwork().then(function() {

        var listener = C.web3.eth.sendTransaction(tx_params)

        listener.on('error', handle.error.bind(listener, context))
        listener.on('transactionHash', handle.hash.bind(listener, context))
        listener.on('confirmation', handle.confirmation.bind(listener, context))
        listener.on('receipt', handle.receipt.bind(listener, context));

      }).catch(promiEvent.reject);

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
      var tx_params = utils.getTxParams(args, C);

      return C.detectNetwork().then(function() {
          return fn(...args).estimateGas(tx_params);
      });
    };
  },

  // This gets attached to `.new` (declared as a static_method in `contract`)
  // during bootstrapping as `estimate`
  estimateDeployment : function(){
    var self = this;
    var args = Array.prototype.slice.call(arguments);

    return self.detectNetwork().then(function() {
      var tx_params = utils.getTxParams(args, self);

      var options = {
        data: tx_params.data || self.binary,
        arguments: args
      };

      delete tx_params['data'];

      var contract_class = new self.web3.eth.Contract(self.abi, tx_params);
      return contract_class.deploy(options).estimateGas(tx_params)
    });
  },
};

module.exports = execute;