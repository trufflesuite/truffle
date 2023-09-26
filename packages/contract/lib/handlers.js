const debug = require("debug")("contract:handlers");
const StatusError = require("./statuserror");
const Utils = require("./utils");
const Reason = require("./reason");

/*
  Handlers for events emitted by `send` / `call` etc.
 */
const handlers = {
  // ----------------------------------- Constants -------------------------------------------------

  maxConfirmations: 24, // Maximum number of confirmation web3 emits
  defaultTimeoutBlocks: 50, // Maximum number of blocks web3 will wait before abandoning tx
  timeoutMessage: "50 blocks", // Substring of web3 timeout error.
  defaultWeb3Error: "please check your gas limit", // Substring of default Web3 error

  // -----------------------------------  Helpers --------------------------------------------------

  /**
   * Parses error message and determines if we should squash web3 timeout errors at user's request.
   * @param  {Object} contract contract instance
   * @param  {Object} message  error message
   * @return {Boolean}
   */
  ignoreTimeoutError({ contract }, { message }) {
    const timedOut = message && message.includes(handlers.timeoutMessage);

    const shouldWait =
      contract &&
      contract.timeoutBlocks &&
      contract.timeoutBlocks > handlers.defaultTimeoutBlocks;

    const waitForTxPropagation =
      message && message.includes(handlers.defaultWeb3Error);

    return shouldWait && (timedOut || waitForTxPropagation);
  },

  /**
   * Attaches Truffle specific handlers to all of the events emitted by a web3 method.
   * @param {Object}       context  execution state
   * @param {PromiEvent}   emitter  promiEvent returned by a web3 method call
   */
  setup: function (emitter, context) {
    emitter.on("error", handlers.error.bind(emitter, context));
    emitter.on("transactionHash", handlers.hash.bind(emitter, context));
    // web3 block polls if the confirmation listener is enabled so we want to
    // give users a way of opting out of this behavior - it causes problems in testing
    if (!context.contract.disableConfirmationListener) {
      emitter.on("confirmation", handlers.confirmation.bind(emitter, context));
    }
    emitter.on("receipt", handlers.receipt.bind(emitter, context));
  },

  // -----------------------------------  Handlers -------------------------------------------------
  /**
   * Error event handler. Emits error unless error is block timeout and user has
   * specified we should wait longer
   * @param  {Object} context   execution state
   * @param  {Object} error     error
   */
  error: function (context, error) {
    if (!handlers.ignoreTimeoutError(context, error)) {
      if (context.promiEvent.eventEmitter.listenerCount("error") > 0) {
        context.promiEvent.eventEmitter.emit("error", error);

        this.off("error", handlers.error);
      }
      context.promiEvent.reject(error);
      return;
    }
  },

  /**
   * Transaction hash event handler. Attaches the hash to the context object
   * so it can be attached to the contract instance after a deployment resolves.
   * @param  {Object} context   execution state
   * @param  {String} hash      transaction hash
   */
  hash: function (context, hash) {
    context.transactionHash = hash;
    context.promiEvent.eventEmitter.emit("transactionHash", hash);
    this.off("transactionHash", handlers.hash);
  },

  confirmation: function (context, number, receipt) {
    context.promiEvent.eventEmitter.emit("confirmation", number, receipt);

    // Per web3: initial confirmation index is 0
    if (number === handlers.maxConfirmations + 1) {
      this.off("confirmation", handlers.confirmation);
    }
  },

  /**
   * Receipt event handler. This handler decodes the event logs, re-emits the receipt,
   * and (for method calls only) resolves/rejects the promiEvent with the receipt.
   * @param  {Object} context   execution state
   * @param  {Object} receipt   transaction receipt
   */
  receipt: async function (context, originalReceipt) {
    // keep around the raw (not decoded) logs in the raw logs field as a
    // stopgap until we can get the ABI for all events, not just the current
    // contract
    const receipt = { ...originalReceipt };
    receipt.rawLogs = receipt.logs;

    // Decode logs, use as receipt.logs for ease of use.
    try {
      receipt.logs = receipt.logs
        ? Utils.decodeLogs.call(context.contract, receipt.logs)
        : [];
    } catch (error) {
      return context.promiEvent.reject(error);
    }

    // Emit receipt
    context.promiEvent.eventEmitter.emit("receipt", receipt);

    // .new(): Exit early. We need the promiEvent to resolve a contract instance.
    if (context.onlyEmitReceipt) {
      context.receipt = receipt;
      return;
    }

    // .method(): resolve/reject receipt in handler
    if (receipt.status !== undefined && !receipt.status) {
      const reason = await Reason.get(
        context.params,
        context.contract.web3,
        context.contract.interfaceAdapter
      );

      const error = new StatusError(
        context.params,
        receipt.transactionHash,
        receipt,
        reason
      );

      return context.promiEvent.reject(error);
    }

    // This object has some duplicate data but is backward compatible.
    context.promiEvent.resolve({
      tx: receipt.transactionHash,
      receipt: receipt,
      logs: receipt.logs
    });

    //HACK: adding this conditional for when the handler is invoked
    //manually during stacktracing
    if (this.off) {
      this.off("receipt", handlers.receipt);
    }
  }
};

module.exports = handlers;
