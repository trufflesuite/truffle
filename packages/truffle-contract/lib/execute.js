var Web3PromiEvent = require('web3-core-promievent');
var EventEmitter = require('events');
var utils = require("./utils");
var StatusError = require("./statuserror");
var handlers = require("./handlers");
var override = require("./override");

var execute = {

  /**
   * Executes method as .call and processes optional `defaultBlock` argument.
   * @param  {Function} fn      method
   * @param  {Array}    inputs  ABI segment defining the methods inputs.
   * @return {Promise}          Return value of the call.
   */
  call: function(fn, inputs, address) {
    var constructor = this;

    return function() {
      var params = {};
      var defaultBlock;
      var args = Array.prototype.slice.call(arguments);
      var lastArg = args[args.length - 1];

      // Extract defaultBlock parameter
      if (execute.hasDefaultBlock(args, lastArg, inputs)){
          defaultBlock = args.pop();
      }

      // Extract tx params
      if (execute.hasTxParams(lastArg)) {
        params = args.pop();
      }

      params.to = address;
      params = utils.merge(constructor.class_defaults, params);

      return constructor
        .detectNetwork()
        .then(() => fn(...args).call(params, defaultBlock));
    };
  },


  /**
   * Executes method as .send
   * @param  {Function}   fn       Method to invoke
   * @param  {String}     address  Deployed address of the targeted instance
   * @return {PromiEvent}          Resolves a transaction receipt (via the receipt handler)
   */
  send: function(fn, address) {
    var constructor = this;
    var web3 = constructor.web3;

    return function() {
      var deferred;
      var args = Array.prototype.slice.call(arguments);
      var params = utils.getTxParams.call(constructor, args);
      var promiEvent = new Web3PromiEvent();

      var context = {
        contract: constructor,
        promiEvent: promiEvent,
        params: params
      }

      constructor.detectNetwork().then(network => {
        params.to = address;
        params.data = fn ? fn(...args).encodeABI() : undefined;

        execute
          .getGasEstimate
          .call(constructor, params, network.blockLimit)
          .then(gas => {
            params.gas = gas
            deferred = web3.eth.sendTransaction(params);
            deferred.catch(override.start.bind(constructor, context));
            handlers.setup(deferred, context);
          })
          .catch(promiEvent.reject)
      }).catch(promiEvent.reject)

      return promiEvent.eventEmitter;
    };
  },


  /**
   * Deploys an instance. Network detection for `.new` happens before invocation at `contract.js`
   * where we check the libraries.
   * @param  {Object} args        Deployment options;
   * @param  {Object} context     Context object that exposes execution state to event handlers.
   * @param  {Number} blockLimit  `block.gasLimit`
   * @return {PromiEvent}         Resolves a TruffleContract instance
  */
  deploy: function(args, context, blockLimit) {
    var constructor = this;
    var abi = constructor.abi;
    var web3 = constructor.web3;
    var params = utils.getTxParams.call(constructor, args);
    var deferred;

    var options = {
      data: constructor.binary,
      arguments: args
    };

    var contract = new web3.eth.Contract(abi);
    params.data = contract.deploy(options).encodeABI();

    execute
      .getGasEstimate
      .call(constructor, params, blockLimit)
      .then(gas => {
        params.gas = gas;
        deferred = web3.eth.sendTransaction(params);
        handlers.setup(deferred, context);

        deferred.then(receipt => {
          if (parseInt(receipt.status) == 0){
            var error = new StatusError(params, context.transactionHash, receipt);
            return context.promiEvent.reject(error)
          }

          var web3Instance = new web3.eth.Contract(abi, receipt.contractAddress);
          web3Instance.transactionHash = context.transactionHash;

          context.promiEvent.resolve(new constructor(web3Instance));

        // Manage web3's 50 blocks' timeout error.
        // Web3's own subscriptions go dead here.
        }).catch(override.start.bind(constructor, context))
      }).catch(context.promiEvent.reject);
  },

  /**
   * Begins listening for an event
   * @param  {Function} fn  Solidity event method
   * @return {Emitter}      Event emitter
   */
  event: function(fn){
    var constructor = this;
    var decoder = utils.decodeLogs;

    return function(params){
      var emitter = new EventEmitter();

      constructor.detectNetwork().then(() =>{
        var listener = fn(params);

        listener.on('data',    e => emitter.emit('data', decoder.call(constructor, e, true)[0]));
        listener.on('changed', e => emitter.emit('changed', decoder.call(constructor, e, true)[0]));
        listener.on('error',   e => emitter.emit('error', e));
      });

      return emitter;
    };
  },

  /**
   * Estimates gas cost of a method invocation
   * @param  {Function} fn  Method to target
   * @return {Promise}
   */
  estimate : function(fn){
    var constructor = this;
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var params = utils.getTxParams.call(constructor, args);

      return constructor.detectNetwork().then(function() {
          return fn(...args).estimateGas(params);
      });
    };
  },

  request : function(fn){
    var constructor = this;
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var params = utils.getTxParams.call(constructor, args);

      return constructor.detectNetwork().then(function() {
          return fn(...args).request(params);
      });
    };
  },

  // This gets attached to `.new` (declared as a static_method in `contract`)
  // during bootstrapping as `estimate`
  estimateDeployment : function(){
    var constructor = this;
    var args = Array.prototype.slice.call(arguments);
    var params = utils.getTxParams.call(constructor, args);

    return constructor.detectNetwork().then(function() {

      var options = {
        data: constructor.binary,
        arguments: args
      };

      delete params['data'];

      var instance = new constructor.web3.eth.Contract(constructor.abi, params);
      return instance.deploy(options).estimateGas(params);
    });
  },

  /**
   * [getGasEstimate description]
   * @param  {[type]} params     [description]
   * @param  {[type]} blockLimit [description]
   * @return {[type]}            [description]
   */
  getGasEstimate: function(params, blockLimit){
    var constructor = this;
    var web3 = this.web3;
    var defaultGas = 90000;

    return new Promise(function(accept, reject){
      // Always prefer specified gas
      if (params.gas) return accept(params.gas);

        web3.eth
          .estimateGas(params)
          .then(gas => {
            var bestEstimate = Math.floor(constructor.gasMultiplier * gas);

            // Don't go over blockLimit
            (bestEstimate >= blockLimit)
              ? accept(blockLimit - 1)
              : accept(bestEstimate);

          // We need to let tx's that revert through.
          // Often that's exactly what you are testing.
          }).catch(err => accept(defaultGas));
    })
  },

  hasTxParams(arg){
    return utils.is_object(arg) && !utils.is_big_number(arg);
  },

  hasDefaultBlock(args, lastArg, inputs){
    var hasDefaultBlock = !execute.hasTxParams(lastArg) && (args.length > inputs.length);
    var hasDefaultBlockWithParams = execute.hasTxParams(lastArg) && (args.length - 1 > inputs.length);
    return hasDefaultBlock || hasDefaultBlockWithParams;
  },
};

module.exports = execute;

