const Reason = require("./reason");
const handlers = require("./handlers");

const override = {
  timeoutMessage: "not mined within", // Substring of timeout err fired by web3
  defaultWeb3Error: "please check your gas limit", // Substring of default Web3 error
  defaultMaxBlocks: 50, // Max # of blocks web3 will wait for a tx
  pollingInterval: 1000,

  /**
   * Attempts to extract receipt object from Web3 error message
   * @param  {Object} message       web3 error
   * @return {Object|undefined} receipt
   */
  extractReceipt(message) {
    const hasReceipt = message && message.includes("{");
    message.includes("}");

    if (hasReceipt) {
      const receiptString = "{" + message.split("{")[1].trim();
      try {
        return JSON.parse(receiptString);
      } catch (err) {
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
  start: async function(context, web3Error) {
    const constructor = this;
    let currentBlock = override.defaultMaxBlocks;

    // Reject after attempting to get reason string if we shouldn't be waiting.
    if (!handlers.ignoreTimeoutError(context, web3Error)) {
      // We might have been routed here in web3 >= beta.34 by their own status check
      // error. We want to extract the receipt, emit a receipt event
      // and reject it ourselves.
      const receipt = override.extractReceipt(web3Error.message);
      if (receipt) {
        await handlers.receipt(context, receipt);
        return;
      }

      // This will run if there's a reason and no status field
      // e.g: revert with reason ganache-cli --vmErrorsOnRPCResponse=true
      const reason = await Reason.get(
        context.params,
        constructor.web3,
        constructor.interfaceAdapter
      );
      if (reason) {
        web3Error.reason = reason;
        web3Error.message += ` -- Reason given: ${reason}.`;
      }

      return context.promiEvent.reject(web3Error);
    }

    // This will run every block from now until contract.timeoutBlocks
    const listener = function(pollID) {
      currentBlock++;

      if (currentBlock > constructor.timeoutBlocks) {
        clearInterval(pollID);
        return;
      }

      constructor.interfaceAdapter
        .getTransactionReceipt(context.transactionHash)
        .then(result => {
          if (!result) return;

          // make sure reporter receives tx receipt promievent
          handlers.receipt(context, result);
          result.contractAddress
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
    let currentPollingBlock = await constructor.interfaceAdapter.getBlockNumber();

    const pollID = setInterval(async () => {
      const newBlock = await constructor.interfaceAdapter.getBlockNumber();

      if (newBlock > currentPollingBlock) {
        currentPollingBlock = newBlock;
        listener(pollID);
      }
    }, override.pollingInterval);
  }
};

module.exports = override;
