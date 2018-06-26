var Web3PromiEvent = require('web3-core-promievent');
var EventEmitter = require('events');
var utils = require("./utils");
var StatusError = require("./statuserror");
var handlers = require("./handlers");
var override = require("./override");

var util = require('util');
var execute = {

  // -----------------------------------  Helpers --------------------------------------------------
  /**
   * Retrieves gas estimate multiplied by the set gas multiplier for a `sendTransaction` call.
   * We're using low level rpc calls here
   * @param  {Object} params     `sendTransaction` parameters
   * @param  {Number} blockLimit  most recent network block.blockLimit
   * @return {Number}             gas estimate
   */
  getGasEstimate: function(params, blockLimit){
    var constructor = this;
    var web3 = this.web3;

    return new Promise(function(accept, reject){
      let reason;

      const packet = {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [params],
        id: new Date().getTime(),
      }

      // This rpc call extracts the reason string
      web3.currentProvider.send(packet, (err, response) => {
        if (response && (response.error || response.result)) {
          reason = execute.extractReason(response, web3)
        }

        web3
          .eth
          .estimateGas(params)
          .then(gas => {
            // Always prefer specified gas - this includes gas set by class_defaults
            if (params.gas)           return accept({gas: params.gas, error: null});
            if (!constructor.autoGas) return accept({gas: null, error: null});

            var bestEstimate = Math.floor(constructor.gasMultiplier * gas);

            // Don't go over blockLimit
            (bestEstimate >= blockLimit)
              ? accept({gas: blockLimit - 1, error: null})
              : accept({gas: bestEstimate, error: null});
          })
          .catch(err => {
            err.reason = reason;

            (params.gas)
              ? accept({gas: params.gas, error: err})
              : accept({gas: null, error: err});
          })
      })
    })
  },

  /**
   * Prepares simple wrapped calls by checking network and organizing the method inputs into
   * objects web3 can consume.
   * @param  {Object} constructor   TruffleContract constructor
   * @param  {Array}  _arguments    Arguments passed to method invocation
   * @return {Promise}              Resolves object w/ tx params disambiguated from arguments
   */
  prepareCall: function(constructor, _arguments){
    var args = Array.prototype.slice.call(_arguments);
    var params = utils.getTxParams.call(constructor, args);

    return constructor
      .detectNetwork()
      .then(() => {return {args: args, params: params}});
  },

  /**
   * Disambiguates between transaction parameter objects and BN / BigNumber objects
   * @param  {Any}  arg
   * @return {Boolean}
   */
  hasTxParams: function(arg){
    return utils.is_object(arg) && !utils.is_big_number(arg);
  },

  /**
   * Processes .call/.estimateGas errors and extracts a reason string if
   *
   * @param  {[type]} err [description]
   * @return {[type]}     [description]
   */
  extractReason(res, web3){
    const isObject = res && typeof res === 'object' && res.error && res.error.data;
    const isString = res && typeof res === 'object' && typeof res.result === 'string';

    if (isObject){
      const data = res.error.data;
      const hash = Object.keys(data)[0];

      if (data[hash].return && data[hash].return.includes('0x08c379a0')){
        return web3.eth.abi.decodeParameter('string', data[hash].return.slice(10))
      }
    }

    if (isString && res.result.includes('0x08c379a0')){
      return web3.eth.abi.decodeParameter('string', res.result.slice(10))
    }
  },

  /**
   * Parses function arguments to discover if the terminal argument specifies the `defaultBlock`
   * to execute a call at.
   * @param  {Array}  args      `arguments` that were passed to method
   * @param  {Any}    lastArg    terminal argument passed to method
   * @param  {Array}  inputs     ABI segment defining method arguments
   * @return {Boolean}           true if final argument is `defaultBlock`
   */
  hasDefaultBlock:  function(args, lastArg, inputs){
    var hasDefaultBlock = !execute.hasTxParams(lastArg) && (args.length > inputs.length);
    var hasDefaultBlockWithParams = execute.hasTxParams(lastArg) && (args.length - 1 > inputs.length);
    return hasDefaultBlock || hasDefaultBlockWithParams;
  },

  // -----------------------------------  Methods --------------------------------------------------

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
      var defaultBlock = 'latest';
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
      var reason;

      var context = {
        contract: constructor,   // Can't name this field `constructor` or `_constructor`
        promiEvent: promiEvent,
        params: params
      }

      constructor.detectNetwork().then(network => {
        params.to = address;
        params.data = fn ? fn(...args).encodeABI() : undefined;

        execute
          .getGasEstimate
          .call(constructor, params, network.blockLimit)
          .then(result => {
            (result.error)
              ? context.reason = result.error.reason
              : context.reason = null;

            params.gas = result.gas || undefined;
            deferred = web3.eth.sendTransaction(params);

            // vmErrorsOnResponse path. Client emulator will
            // reject via the receipt handler
            deferred.catch(err => {
              err.reason = (result.error) ? result.error.reason : null;
              override.start.call(constructor, context, err)
            });

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
    var reason;

    var options = {
      data: constructor.binary,
      arguments: args
    };

    var contract = new web3.eth.Contract(abi);
    params.data = contract.deploy(options).encodeABI();

    execute
      .getGasEstimate
      .call(constructor, params, blockLimit)
      .then(result => {
        if (result.error) reason = result.error.reason;

        params.gas = result.gas || undefined;
        deferred = web3.eth.sendTransaction(params);
        handlers.setup(deferred, context);

        deferred.then(receipt => {
          if (parseInt(receipt.status) == 0){
            var error = new StatusError(params, context.transactionHash, receipt);
            error.reason = reason;
            return context.promiEvent.reject(error)
          }

          var web3Instance = new web3.eth.Contract(abi, receipt.contractAddress);
          web3Instance.transactionHash = context.transactionHash;

          context.promiEvent.resolve(new constructor(web3Instance));

        // Manage web3's 50 blocks' timeout error. Web3's own subscriptions go dead here.
        // Also propagate any reason strings captured during estimate gas.
        }).catch(err => {
          err.reason = reason;
          override.start.call(constructor, context, err)
        })
      }).catch(context.promiEvent.reject);
  },

  /**
   * Begins listening for an event
   * @param  {Function} fn  Solidity event method
   * @return {Emitter}      Event emitter
   */
  event: function(fn){
    var constructor = this;
    var decode = utils.decodeLogs;
    var currentLogID = null;

    // Someone upstream is firing duplicates :/
    function dedupe(id){
      return (id === currentLogID)
        ? false
        : currentLogID = id;
    }

    return function(params){
      var emitter = new EventEmitter();

      constructor.detectNetwork().then(() =>{
        var event = fn(params);

        event.on('data', e => dedupe(e.id) && emitter.emit('data', decode.call(constructor, e, true)[0]));
        event.on('changed', e => dedupe(e.id) && emitter.emit('changed', decode.call(constructor, e, true)[0]));
        event.on('error', e => emitter.emit('error', e));
      });

      return emitter;
    };
  },

  /**
   * Wraps web3 `allEvents`, with additional log decoding
   * @return {PromiEvent}  EventEmitter
   */
  allEvents: function(web3Instance){
    var constructor = this;
    var decode = utils.decodeLogs;
    var currentLogID = null;

    // Someone upstream is firing duplicates :/
    function dedupe(id){
      return (id === currentLogID)
        ? false
        : currentLogID = id;
    }

    return function(params){
      var emitter = new EventEmitter();

      constructor.detectNetwork().then(() => {
        var event = web3Instance.events.allEvents(params);

        event.on('data', e => dedupe(e.id) && emitter.emit('data', decode.call(constructor, e, true)[0]));
        event.on('changed', e => dedupe(e.id) && emitter.emit('changed', decode.call(constructor, e, true)[0]));
        event.on('error', e => emitter.emit('error', e));
      });

      return emitter;
    };
  },

  /**
   * Wraps web3 `getPastEvents`, with additional log decoding
   * @return {Promise}  Resolves array of event objects
   */
  getPastEvents: function(web3Instance){
    var constructor = this;
    var decode = utils.decodeLogs;

    return function(event, options){
      return web3Instance
        .getPastEvents(event, options)
        .then(events => decode.call(constructor, events, false))
    }
  },

  /**
   * Estimates gas cost of a method invocation
   * @param  {Function} fn  Method to target
   * @return {Promise}
   */
  estimate : function(fn){
    var constructor = this;
    return function() {

      return execute
        .prepareCall(constructor, arguments)
        .then(res => fn(...res.args).estimateGas(res.params));
    };
  },

  request : function(fn){
    var constructor = this;
    return function() {

      return execute
        .prepareCall(constructor, arguments)
        .then(res => fn(...res.args).request(res.params));
    };
  },

  // This gets attached to `.new` (declared as a static_method in `contract`)
  // during bootstrapping as `estimate`
  estimateDeployment : function(){
    var constructor = this;
    return execute
      .prepareCall(constructor, arguments)
      .then(res => {
        var options = {
          data: constructor.binary,
          arguments: res.args
        };

        delete res.params['data'];  // Is this necessary?

        var instance = new constructor.web3.eth.Contract(constructor.abi, res.params);
        return instance.deploy(options).estimateGas(res.params);
      });
  },
};

module.exports = execute;

