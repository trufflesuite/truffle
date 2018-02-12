var StatusError = require("./statuserror");
var Utils = require("./utils");

/*
  Handlers for events emitted by `send` / `call` etc.
  Listed in execution order.
 */
var handlers = {

  // Magic number of confirmations to listen for at web3
  _CONFIRMATIONBLOCKS: 24,

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

  error: function(context, error){
    context.promiEvent.eventEmitter.emit('error', error);
    clearInterval(context.interval);

    // Everywhere but `new`.
    if (!context.allowError){
      context.promiEvent.reject(error);
    }

    // TO DO: capture & ignore '50 blocks' error for `.new`
    // All the event emitters & promise will go dead so we'll need
    // to replicate what web3 does here.
  },

  // Collect hash for contract.new (we attach it to the contract there)
  // Start polling and collect interval so we can kill poll in `handleReceipt`
  // and `contract.new.then`
  hash: function(context, hash){
    var start = new Date().getTime();
    context.transactionHash = hash;
    context.promiEvent.eventEmitter.emit('transactionHash', hash);

    context.interval = setInterval(function(){
      handlers._synchronize(start, context)
    }, 1000);
  },

  confirmation: function(context, number, receipt){
    context.promiEvent.eventEmitter.emit('confirmation', number, receipt)
    if (number === handlers._CONFIRMATIONBLOCKS + 1) { // Per web3: initial conf index is 0
      this.removeAllListeners();
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
      var error = new StatusError(context.tx_params, receipt.transactionHash, receipt);
      context.promiEvent.reject(error)
    }

    var logs;
    (receipt.events)
      ? logs = Utils.decodeLogs(context.contract, receipt.events)
      : logs = [];

    context.promiEvent.resolve({
      tx: receipt.transactionHash,
      receipt: receipt,
      logs: logs
    });
  },
}

module.exports = handlers;