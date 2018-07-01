var subscriptions = require("./subscriptions");

var override = {

  timeoutMessage: 'not mined within', // Substring of timeout err fired by web3
  defaultMaxBlocks: 50,               // Max # of blocks web3 will wait for a tx
  pollingInterval: 1000,

  /**
   * Fired after web3 ceases to support subscriptions if user has specified
   * a higher block wait time than web3's 50 blocks limit. Opens a subscription to listen
   * for new blocks and begins evaluating whether block height has reached the user
   * defined timeout threshhold. Resolves either a contract instance or a transaction receipt.
   *
   * @param  {Object} context execution state
   * @param  {Object} err     error
   */
  start: async function(context, web3Error){
    var constructor = this;
    var blockNumber = null;
    var currentBlock = override.defaultMaxBlocks;
    var maxBlocks = constructor.timeoutBlocks;

    var timedOut = web3Error.message && web3Error.message.includes(override.timeoutMessage);
    var shouldWait = maxBlocks > currentBlock;

    // Reject if we shouldn't be waiting.
    if (!timedOut || !shouldWait) return context.promiEvent.reject(web3Error);

    // This will run every block from now until contract.timeoutBlocks
    var listener = function(pollID){
      var self = this;
      currentBlock++;

      if (currentBlock > constructor.timeoutBlocks){
        clearInterval(pollID)
        return;
      }

      constructor.web3.eth.getTransactionReceipt(context.transactionHash)
        .then(result => {
          if (!result) return;

          (result.contractAddress)
            ? constructor
                .at(result.contractAddress)
                .then(context.promiEvent.resolve)
                .catch(context.promiEvent.reject)

            : constructor.promiEvent.resolve(result);

        })
        .catch(err => {
          clearInterval(pollID)
          context.promiEvent.reject(err);
        });
    };

    // Start polling
    let currentPollingBlock = await constructor.web3.eth.getBlockNumber();

    const pollID = setInterval(async() => {
      const newBlock = await constructor.web3.eth.getBlockNumber();

      if(newBlock > currentPollingBlock){
        currentPollingBlock = newBlock;
        listener(pollID);
      }
    }, override.pollingInterval);


    // Temporarily disabled new_head subscription. There are bugs at Web3 and at
    // Geth that impair the reliablility of this sub atm.

    /*
    var id = new Date().getTime();
    subscriptions.subscribe(constructor, 'newHeads', id)
      .then(result => constructor.web3.currentProvider.on('data', listener))
      .catch(context.promiEvent.reject);
    */
  },
}

module.exports = override;
