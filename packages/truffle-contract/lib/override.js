var Reason = require('./reason');
var handlers = require('./handlers');

var override = {

  timeoutMessage: 'not mined within', // Substring of timeout err fired by web3
  defaultMaxBlocks: 50,               // Max # of blocks web3 will wait for a tx
  pollingInterval: 1000,

  /**
   * Attempts to extract receipt object from Web3 error message
   * @param  {Object} message       web3 error
   * @return {Object|undefined} receipt
   */
  extractReceipt(message){
    const hasReceipt = message &&
                       message.includes('{');
                       message.includes('}');

    if (hasReceipt){
      const receiptString =  '{' + message.split('{')[1].trim();
      try {
        return JSON.parse(receiptString);
      } catch (err){
        // ignore
      }
    }
  },

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

    // Reject after attempting to get reason string if we shouldn't be waiting.
    if (!timedOut || !shouldWait){

      // We might have been routed here in web3 >= beta.34 by their own status check
      // error. We want to extract the receipt, emit a receipt event
      // and reject it ourselves.
      var receipt = override.extractReceipt(web3Error.message);
      if (receipt){
        await handlers.receipt(context, receipt);
        return;
      }

      // This will run if there's a reason and no status field
      // e.g: revert with reason ganache-cli --vmErrorsOnRPCResponse=true
      var reason = await Reason.get(context.params, constructor.web3);
      if (reason) {
        web3Error.reason = reason;
        web3Error.message += ` -- Reason given: ${reason}.`;
      }

      return context.promiEvent.reject(web3Error);
    }

    // This will run every block from now until contract.timeoutBlocks
    var listener = function(pollID){
      var self = this;
      currentBlock++;

      if (currentBlock > constructor.timeoutBlocks){
        clearInterval(pollID);
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
          clearInterval(pollID);
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
  },
};

module.exports = override;
