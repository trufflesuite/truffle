var subscriptions = require("./subscriptions");

var override = {

  timeoutMessage: '50 blocks', // Substring of timeout err fired by web3
  defaultMaxBlocks: 50,   // Max # of blocks web3 will wait for a tx

  /**
   * check
   * @param  {[type]} context [description]
   * @param  {[type]} err     [description]
   * @return {[type]}         [description]
   */
  start: function(context, err){
    var constructor = this;
    context.subscriber = constructor;
    var currentBlock = override.defaultMaxBlocks;
    var maxBlocks = constructor.timeoutBlocks;

    var timedOut = err.message && err.message.includes(override.timeoutMessage);
    var shouldWait = maxBlocks > currentBlock;

    // Reject if we shouldn't be waiting.
    if (!timedOut || !shouldWait) return context.promiEvent.reject(error);

    // Otherwise, launch new block subscription with our listener
    var id = new Date().getTime();
    subscriptions
      .subscribe(constructor, 'newHeads', id)
      .then(result => {
        constructor
          .web3
          .currentProvider
          .on('data', data => {
            currentBlock++;
            override.checkReceipt(context, currentBlock, maxBlocks)
          });
      })
      .catch(context.promiEvent.reject);
  },

  /**
   * Fired on each block after web3 ceases to support subscriptions if user has specified
   * a higher block wait time than web3's 50 blocks limit. Evaluates block height to see if
   * we should continue and resolves either a contract instance or a transaction receipt
   * depending on the the type of call.
   *
   * @param  {Object} context      Context object that exposes execution state to event handlers.
   * @param  {Number} currentBlock Block height accumulated since method call was first confirmed.
   * @param  {Number} maxBlocks    Maximum block height to wait until before bailing.
   */
  checkReceipt: function(context, currentBlock, maxBlocks){
    var self = this;
    var constructor = context.subscriber;

    // If we exceeded our custom timeout, shut everything down.
    if (currentBlock > maxBlocks){
      subscriptions.unsubscribe(context.subscriber, id);
      self.removeAllListeners();

      return context.promiEvent.reject(error);
    }

    // Otherwise, try to retrieve the receipt and resolve either
    // a contract instance if receipt indicates, or just receipt if not.
    constructor
      .web3.eth
      .getTransactionReceipt(context.transactionHash)
      .then(result => {
        if (!result) return;

        self.removeAllListeners();

        (result.contractAddress)
          ? constructor
              .at(result.contractAddress)
              .then(context.promiEvent.resolve)
              .catch(context.promiEvent.reject)

          : context.promiEvent.resolve(result);

      }).catch(err => {
        self.removeAllListeners();
        context.promiEvent.reject(err);
      });
  },
}

module.exports = override;