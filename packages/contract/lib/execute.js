const debug = require("debug")("contract:execute");
const PromiEvent = require("./promievent");
const EventEmitter = require("events");
const utils = require("./utils");
const StatusError = require("./statuserror");
const Reason = require("./reason");
const handlers = require("./handlers");
const override = require("./override");
const reformat = require("./reformat");
const { sendTransactionManual } = require("./manual-send");

const execute = {
  // -----------------------------------  Helpers --------------------------------------------------
  /**
   * Retrieves gas estimate multiplied by the set gas multiplier for a `sendTransaction` call.
   * Lacking an estimate, sets gas to have of latest blockLimit
   * @param  {Object} params     `sendTransaction` parameters
   * @param  {Number} blockLimit  most recent network block.blockLimit
   * @return {Number}             gas estimate
   */
  getGasEstimate: function (params, blockLimit, stacktrace = false) {
    const constructor = this;
    const interfaceAdapter = constructor.interfaceAdapter;
    const web3 = constructor.web3;

    return new Promise(function (accept, reject) {
      // Always prefer gas specified by user (if a user sets gas to 0, that is treated
      // as undefined here and we do proceed to do gas estimation)
      if (params.gas) return accept(params.gas);
      if (!constructor.autoGas) return accept();

      interfaceAdapter
        .estimateGas(params, stacktrace)
        .then(gas => {
          // there are situations where the web3 gas estimation function in interfaceAdapter
          // fails, specifically when a transaction will revert; we still want to continue
          // the user flow for debugging purposes if the user has enabled stacktraces; so we provide a
          // default gas for that situation, equal to half of the blockLimit for the latest block
          //
          // note: this means if a transaction will revert but the user does not have stacktracing enabled,
          // they will get an error from the gas estimation and be unable to proceed; we may need to revisit this
          if (gas === null) {
            const defaultGas = utils.bigNumberify(Math.floor(blockLimit / 2));
            accept(defaultGas.toHexString());
          } else {
            const limit = utils.bigNumberify(blockLimit);
            // if we did get a numerical gas estimate from interfaceAdapter, we
            // multiply that estimate by the gasMultiplier to help ensure we
            // have enough gas for the transaction
            const bestEstimate = utils.multiplyBigNumberByDecimal(
              utils.bigNumberify(gas),
              constructor.gasMultiplier
            );
            // Check that we don't go over blockLimit
            bestEstimate.gte(limit)
              ? accept(limit.sub(1).toHexString())
              : accept(bestEstimate.toHexString());
          }
        })
        .catch(error => {
          //HACK: Frankenstein together an error in a destructive fashion!!
          debug("error: %O", error);
          const reason = Reason._extract({ error }, web3);
          error.reason = reason;
          if (reason) {
            error.message += ` -- Reason given: ${reason}.`;
          }
          reject(error);
        });
    });
  },

  /**
   * Prepares simple wrapped calls by checking network and organizing the method inputs into
   * objects web3 can consume.
   * @param  {Object} constructor   TruffleContract constructor
   * @param  {Object} methodABI     Function ABI segment w/ inputs & outputs keys.
   * @param  {Array}  _arguments    Arguments passed to method invocation
   * @param  {Boolean}  isCall      Used when preparing a call as opposed to a tx;
   *                                  skips network checks and ignores default gas prices
   * @return {Promise}              Resolves object w/ tx params disambiguated from arguments
   */
  prepareCall: async function (constructor, methodABI, _arguments, isCall) {
    let args = Array.prototype.slice.call(_arguments);
    let params = utils.getTxParams.call(constructor, methodABI, args, isCall);

    args = utils.convertToEthersBN(args);

    if (constructor.ens && constructor.ens.enabled) {
      const { web3 } = constructor;
      const processedValues = await utils.ens.convertENSNames({
        networkId: constructor.network_id,
        ens: constructor.ens,
        inputArgs: args,
        inputParams: params,
        methodABI,
        web3
      });
      args = processedValues.args;
      params = processedValues.params;
    }
    //isCall flag used to skip network call for read data (calls type) methods invocation
    if (isCall) {
      return { args, params };
    }
    const network = await constructor.detectNetwork();
    return { args, params, network };
  },

  /**
   * Disambiguates between transaction parameter objects and BN / BigNumber objects
   * @param  {Any}  arg
   * @return {Boolean}
   */
  hasTxParams: function (arg) {
    return utils.is_object(arg) && !utils.is_big_number(arg);
  },

  /**
   * Parses function arguments to discover if the terminal argument specifies the `defaultBlock`
   * to execute a call at.
   * @param  {Array}  args      `arguments` that were passed to method
   * @param  {Any}    lastArg    terminal argument passed to method
   * @param  {Array}  methodABI  ABI for the method; null for ABI-less calls
   * @return {Boolean}           true if final argument is `defaultBlock`
   */
  hasDefaultBlock: function (args, lastArg, methodABI) {
    const expectedArgsCount = methodABI ? methodABI.inputs.length : 0;
    const hasDefaultBlock =
      !execute.hasTxParams(lastArg) && args.length > expectedArgsCount;
    const hasDefaultBlockWithParams =
      execute.hasTxParams(lastArg) && args.length - 1 > expectedArgsCount;
    return hasDefaultBlock || hasDefaultBlockWithParams;
  },

  // -----------------------------------  Methods --------------------------------------------------

  /**
   * Executes method as .call and processes optional `defaultBlock` argument.
   * @param  {Function} fn         method
   * @param  {Object}   methodABI  Function ABI segment w/ inputs & outputs keys.
   * @return {Promise}             Return value of the call.
   */
  call: function (fn, methodABI, address) {
    const constructor = this;

    return function () {
      let defaultBlock = constructor.web3.eth.defaultBlock || "latest";
      const args = Array.prototype.slice.call(arguments);
      const lastArg = args[args.length - 1];
      const promiEvent = new PromiEvent();

      // Extract defaultBlock parameter
      if (execute.hasDefaultBlock(args, lastArg, methodABI)) {
        defaultBlock = args.pop();
      }
      //skipNetworkCheck flag passed to skip network call for read data (calls type) methods invocation
      const skipNetworkCheck = true;
      execute
        .prepareCall(constructor, methodABI, args, skipNetworkCheck)
        .then(async ({ args, params }) => {
          let result;

          params.to = address;

          promiEvent.eventEmitter.emit("execute:call:method", {
            fn: fn,
            args: args,
            address: address,
            abi: methodABI,
            contract: constructor
          });

          result = fn //null fn is used for instance.call()
            ? await fn(...args).call(params, defaultBlock)
            : await constructor.web3.eth.call(params, defaultBlock);
          result = reformat.numbers.call(
            constructor,
            result,
            methodABI ? methodABI.outputs : []
          );
          return promiEvent.resolve(result);
        })
        .catch(promiEvent.reject);

      return promiEvent.eventEmitter;
    };
  },

  /**
   * Executes method as .send
   * @param  {Function} fn         Method to invoke
   * @param  {Object}   methodABI  Function ABI segment w/ inputs & outputs keys.
   * @param  {String}   address    Deployed address of the targeted instance
   * @return {PromiEvent}          Resolves a transaction receipt (via the receipt handler)
   */
  send: function (fn, methodABI, address) {
    const constructor = this;
    const web3 = constructor.web3;

    return function () {
      const promiEvent = new PromiEvent(false, constructor.debugger);

      execute
        .prepareCall(constructor, methodABI, arguments)
        .then(async ({ args, params, network }) => {
          const context = {
            contract: constructor, // Can't name this field `constructor` or `_constructor`
            promiEvent: promiEvent,
            blockLimit: network.blockLimit,
            params: params
          };

          params.to = address;
          params.data = fn ? fn(...args).encodeABI() : params.data;

          promiEvent.eventEmitter.emit("execute:send:method", {
            fn,
            args,
            address,
            abi: methodABI,
            contract: constructor
          });

          params.gas = await execute.getGasEstimate.call(
            constructor,
            params,
            network.blockLimit,
            promiEvent.debug //apply stacktracing mode if promiEvent.debug is true
          );

          execute
            .sendTransaction(web3, params, promiEvent, context) //the crazy things we do for stacktracing...
            .then(receipt => {
              if (promiEvent.debug) {
                // in this case, we need to manually invoke the handler since it
                // hasn't been set up (hack?)
                handlers.receipt(context, receipt);
              }
              //otherwise, just let the handlers handle things
            })
            .catch(override.start.bind(constructor, context));
        })
        .catch(promiEvent.reject);

      return promiEvent.eventEmitter;
    };
  },

  /**
   * Deploys an instance
   * @param  {Object} constructorABI  Constructor ABI segment w/ inputs & outputs keys
   * @return {PromiEvent}             Resolves a TruffleContract instance
   */
  deploy: function (constructorABI) {
    const constructor = this;
    const web3 = constructor.web3;

    return function () {
      let deferred;
      const promiEvent = new PromiEvent(false, constructor.debugger, true);

      execute
        .prepareCall(constructor, constructorABI, arguments)
        .then(async ({ args, params, network }) => {
          const { blockLimit } = network;

          utils.checkLibraries.apply(constructor);

          // Promievent and flag that allows instance to resolve (rather than just receipt)
          const context = {
            contract: constructor,
            promiEvent,
            blockLimit,
            onlyEmitReceipt: true
          };

          const options = {
            data: constructor.binary,
            arguments: args
          };

          const contract = new web3.eth.Contract(constructor.abi);
          params.data = contract.deploy(options).encodeABI();

          params.gas = await execute.getGasEstimate.call(
            constructor,
            params,
            blockLimit,
            promiEvent.debug //apply stacktracing mode if promiEvent.debug is true
          );

          context.params = params;

          promiEvent.eventEmitter.emit("execute:deploy:method", {
            args,
            abi: constructorABI,
            contract: constructor
          });

          deferred = execute.sendTransaction(web3, params, promiEvent, context); //the crazy things we do for stacktracing...

          try {
            const receipt = await deferred;
            if (receipt.status !== undefined && !receipt.status) {
              const reason = await Reason.get(params, web3);

              const error = new StatusError(
                params,
                context.transactionHash,
                receipt,
                reason
              );

              return context.promiEvent.reject(error);
            }

            const web3Instance = new web3.eth.Contract(
              constructor.abi,
              receipt.contractAddress
            );
            web3Instance.transactionHash = context.transactionHash;

            context.promiEvent.resolve(new constructor(web3Instance));
          } catch (web3Error) {
            // Manage web3's 50 blocks' timeout error.
            // Web3's own subscriptions go dead here.
            await override.start.call(constructor, context, web3Error);
          }
        })
        .catch(promiEvent.reject);

      return promiEvent.eventEmitter;
    };
  },

  /**
   * Begins listening for an event OR manages the event callback
   * @param  {Function} fn  Solidity event method
   * @return {Emitter}      Event emitter
   */
  event: function (fn) {
    const constructor = this;
    const decode = utils.decodeLogs;
    let currentLogID = null;

    // Someone upstream is firing duplicates :/
    function dedupe(id) {
      return id === currentLogID ? false : (currentLogID = id);
    }

    return function (params, callback) {
      if (typeof params === "function") {
        callback = params;
        params = {};
      }

      // As callback
      if (callback !== undefined) {
        const intermediary = function (err, e) {
          if (err) return callback(err);
          if (!dedupe(e.id)) return;
          callback(null, decode.call(constructor, e, true)[0]);
        };

        return constructor
          .detectNetwork()
          .then(() => fn.call(constructor.events, params, intermediary));
      }

      // As EventEmitter
      const emitter = new EventEmitter();

      constructor.detectNetwork().then(() => {
        const event = fn(params);

        event.on(
          "data",
          e =>
            dedupe(e.id) &&
            emitter.emit("data", decode.call(constructor, e, true)[0])
        );
        event.on(
          "changed",
          e =>
            dedupe(e.id) &&
            emitter.emit("changed", decode.call(constructor, e, true)[0])
        );
        event.on("error", e => emitter.emit("error", e));
      });

      return emitter;
    };
  },

  /**
   * Wraps web3 `allEvents`, with additional log decoding
   * @return {PromiEvent}  EventEmitter
   */
  allEvents: function (web3Instance) {
    const constructor = this;
    const decode = utils.decodeLogs;
    let currentLogID = null;

    // Someone upstream is firing duplicates :/
    function dedupe(id) {
      return id === currentLogID ? false : (currentLogID = id);
    }

    return function (params) {
      const emitter = new EventEmitter();

      constructor.detectNetwork().then(() => {
        const event = web3Instance.events.allEvents(params);

        event.on(
          "data",
          e =>
            dedupe(e.id) &&
            emitter.emit("data", decode.call(constructor, e, true)[0])
        );
        event.on(
          "changed",
          e =>
            dedupe(e.id) &&
            emitter.emit("changed", decode.call(constructor, e, true)[0])
        );
        event.on("error", e => emitter.emit("error", e));
      });

      return emitter;
    };
  },

  /**
   * Wraps web3 `getPastEvents`, with additional log decoding
   * @return {Promise}  Resolves array of event objects
   */
  getPastEvents: function (web3Instance) {
    const constructor = this;
    const decode = utils.decodeLogs;

    return function (event, options) {
      return web3Instance
        .getPastEvents(event, options)
        .then(events => decode.call(constructor, events, false));
    };
  },

  /**
   * Estimates gas cost of a method invocation
   * @param  {Function} fn  Method to target
   * @param  {Object}   methodABI  Function ABI segment w/ inputs & outputs keys.
   * @return {Promise}
   */
  estimate: function (fn, methodABI, address) {
    const constructor = this;
    return function () {
      return execute
        .prepareCall(constructor, methodABI, arguments)
        .then(async res =>
          fn //null fn is used for instance.estimateGas()
            ? await fn(...res.args).estimateGas(res.params)
            : await constructor.web3.eth.estimateGas({
                ...res.params,
                to: address
              })
        );
    };
  },

  /**
   *
   * @param  {Function} fn  Method to target
   * @param  {Object}   methodABI  Function ABI segment w/ inputs & outputs keys.
   * @return {Promise}
   */
  request: function (fn, methodABI, address) {
    const constructor = this;
    return function () {
      return execute
        .prepareCall(constructor, methodABI, arguments)
        .then(res => {
          //clone res.params
          let tx = {};
          for (let key in res.params) {
            tx[key] = res.params[key];
          }
          //set to
          tx.to = address;
          //set data
          tx.data = fn(...res.args).encodeABI();
          return tx;
        });
    };
  },

  // This gets attached to `.new` (declared as a static_method in `contract`)
  // during bootstrapping as `estimateGas`
  estimateDeployment: function () {
    const constructor = this;

    const constructorABI = constructor.abi.filter(
      i => i.type === "constructor"
    )[0];

    return execute
      .prepareCall(constructor, constructorABI, arguments)
      .then(res => {
        const options = {
          data: constructor.binary,
          arguments: res.args
        };

        delete res.params["data"]; // Is this necessary?

        const instance = new constructor.web3.eth.Contract(
          constructor.abi,
          res.params
        );
        return instance.deploy(options).estimateGas(res.params);
      });
  },

  // This gets attached to `.new` (declared as a static_method in `contract`)
  // during bootstrapping as `request`
  requestDeployment: function () {
    const constructor = this;

    const constructorABI = constructor.abi.filter(
      i => i.type === "constructor"
    )[0];

    return execute
      .prepareCall(constructor, constructorABI, arguments)
      .then(res => {
        //clone res.params
        let tx = {};
        for (let key in res.params) {
          tx[key] = res.params[key];
        }

        const options = {
          data: constructor.binary,
          arguments: res.args
        };

        const instance = new constructor.web3.eth.Contract(
          constructor.abi,
          res.params
        );
        tx.data = instance.deploy(options).encodeABI();
        return tx;
      });
  },

  //our own custom sendTransaction function, made to mimic web3's,
  //while also being able to do things, like, say, store the transaction
  //hash even in case of failure.  it's not as powerful in some ways,
  //as it just returns an ordinary Promise rather than web3's PromiEvent,
  //but it's more suited to our purposes (we're not using that PromiEvent
  //functionality here anyway)
  //input works the same as input to web3.sendTransaction
  //(well, OK, it's lacking some things there too, but again, good enough
  //for our purposes)
  sendTransaction: async function (web3, params, promiEvent, context) {
    //if we don't need the debugger, let's not risk any errors on our part,
    //and just have web3 do everything
    if (!promiEvent || !promiEvent.debug) {
      const deferred = web3.eth.sendTransaction(params);
      handlers.setup(deferred, context);
      return deferred;
    }
    //otherwise, do things manually!
    //(and skip the PromiEvent stuff :-/ )
    return sendTransactionManual(web3, params, promiEvent);
  }
};

module.exports = execute;
