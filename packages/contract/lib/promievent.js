const debug = require("debug")("contract:promievent");
const Web3PromiEvent = require("web3-core-promievent");

function PromiEvent(justPromise, bugger) {
  const { resolve, reject, eventEmitter } = new Web3PromiEvent(justPromise);

  originalStackTrace = new Error().stack;

  function rejectHijacker(e) {
    debug("hijacking!");
    debug("hash: %s", this.txHash);
    let getSolidityStackTrace;
    if (bugger && this.txHash) {
      getSolidityStackTrace = async () => {
        try {
          let session = bugger.connect();
          await session.load(this.txHash);
          await session.continueUntilBreakpoint();
          const report = session.view(
            session.selectors.stacktrace.current.finalReport
          );
          await session.unload();
          return DebugUtils.formatStacktrace(report, 4); //indent 4 to match node's stacktraces
        } catch (_) {
          //ignore errors
          return undefined;
        }
      };
    } else {
      getSolidityStackTrace = async () => undefined;
    }

    getSolidityStackTrace().then(solidityStackTrace => {
      debug("e.stack: %s", e.stack);
      debug("originalStackTrace: %s", originalStackTrace);
      try {
        let stackTrace = originalStackTrace.replace(
          /^.*/, //multi-line mode; . does not include \n
          e.stack.split("\n")[0]
        );
        if (solidityStackTrace) {
          stackTrace = stackTrace.replace(
            /^.*/, //multi-line mode; . does not include \n
            solidityStackTrace //note: this does not end in \n, so no modification needed
          );
        }

        e.hijackedStack = e.stack;
        e.stack = stackTrace;
      } catch (_) {
        //again, ignore errors
        //(not sure how this can happen here but I'll leave this block here)
      }
      reject(e);
    });
  }

  this.resolve = resolve;
  this.reject = rejectHijacker;
  this.eventEmitter = eventEmitter;
}

PromiEvent.resolve = Web3PromiEvent.resolve;

PromiEvent.prototype.setTransactionHash = function(txHash) {
  debug("setting!");
  debug("hash: %s", txHash);
  this.txHash = txHash;
};

module.exports = PromiEvent;
