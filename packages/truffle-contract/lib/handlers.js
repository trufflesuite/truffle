var StatusError = require("./statuserror");
var Utils = require("./utils");

/*
  Handlers for events emitted by `send` / `call` etc.
  Listed in execution order.
 */
var handlers = {

  // Constants to override at web3
  _CONFIRMATIONBLOCKS: 24,
  _defaultTimeoutBlocks: 50,
  _timeoutSignal: '50 blocks',

  // Error after some number of ms if receipt never arrives
  _synchronize: function(start, context){
    // Don't synchronize `new`
    if(!context.contract) return;

    var sync = context.contract.synchronization_timeout;
    var timeout;

    ( sync === 0 || sync !== undefined)
      ? timeout = sync
      : timeout = 240000;

    if (timeout > 0 && new Date().getTime() - start > timeout) {
      var err = "Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"
      context.promievent.reject(new Error(err));
    }
  },

  _shouldIgnore: function(context, error){
    var timedOut = error.message && error.message.includes(handlers._timeoutSignal);
    var shouldWait = context.contract &&
                     context.contract.timeoutBlocks &&
                     context.contract.timeoutBlocks > handlers._defaultTimeoutBlocks;

    return timedOut && shouldWait;
  },

  error: function(context, error){
    if (!handlers._shouldIgnore(context, error)){
      context.promiEvent.eventEmitter.emit('error', error);
      clearInterval(context.interval);
      this.removeListener('error', handlers.error);
      context.promiEvent.reject(error);
    }
  },

  // Collect hash for contract.new (we attach it to the contract there)
  // Start polling / set interval variable so we can kill it in
  // `handleReceipt` and `contract.new.then`
  hash: function(context, hash){
    var start = new Date().getTime();
    context.transactionHash = hash;
    context.promiEvent.eventEmitter.emit('transactionHash', hash);

    context.interval = setInterval(function(){
      handlers._synchronize(start, context)
    }, 1000);

    this.removeListener('transactionHash', handlers.hash);
  },

  confirmation: function(context, number, receipt){
    context.promiEvent.eventEmitter.emit('confirmation', number, receipt)

    // Per web3: initial confirmation index is 0
    if (number === handlers._CONFIRMATIONBLOCKS + 1) {
      this.removeListener('confirmation', handlers.confirmation);
    }
  },

  // Keeping a distinction between `receipt emitter` and Truffle resolving
  // a more processed object
  receipt: function(context, receipt){
    context.receipt = receipt;
    context.promiEvent.eventEmitter.emit('receipt', receipt);
    clearInterval(context.interval);

    if (context.onlyEmitReceipt)
      return;

    if (parseInt(receipt.status) == 0){
      var error = new StatusError(context.params, receipt.transactionHash, receipt);
      return context.promiEvent.reject(error)
    }

    var logs;

    (receipt.logs)
      ? logs = Utils.decodeLogs(context.contract, receipt.logs)
      : logs = [];

    context.promiEvent.resolve({
      tx: receipt.transactionHash,
      receipt: receipt,
      logs: logs
    });
  },
}

module.exports = handlers;