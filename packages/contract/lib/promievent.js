const debug = require("debug")("contract:promievent");
const DebugUtils = require("@truffle/debug-utils");
const Web3PromiEvent = require("web3-core-promievent");

function PromiEvent(justPromise, bugger = undefined, isDeploy = false) {
  const { resolve, reject, eventEmitter } = new Web3PromiEvent(justPromise);

  const originalStackTrace = new Error().stack;

  function rejectHijacker(e) {
    debug("hijacking!");
    debug("hash: %s", this.txHash);
    let getSolidityStackTrace;
    if (bugger && this.txHash) {
      debug("debugging time!");
      getSolidityStackTrace = async () => {
        try {
          await bugger.load(this.txHash);
          await bugger.continueUntilBreakpoint();
          const report = bugger.stacktrace();
          await bugger.unload();
          return DebugUtils.formatStacktrace(report, 4); //indent 4 to match node's stacktraces
        } catch (_) {
          //ignore errors
          return undefined;
        }
      };
    } else {
      getSolidityStackTrace = async () => undefined;
    }

    getSolidityStackTrace().then((solidityStackTrace) => {
      debug("e.stack: %s", e.stack);
      debug("originalStackTrace: %s", originalStackTrace);
      debug("solidityStackTrace: %s", solidityStackTrace);
      const initialLinesRegexp = isDeploy
        ? /^.*\n.*\n.*\n.*/ //first 4 lines (note . does not include \n)
        : /^.*\n.*\n.*/; //first 3 lines
      //we replace not just the first line but also the next 2 as they contain
      //useless stuff users shouldn't see; in case of deployments there's one
      //additional to remove
      try {
        let stackTrace = originalStackTrace.replace(
          initialLinesRegexp,
          e.stack.split("\n")[0]
        );
        if (solidityStackTrace) {
          //let's split the solidity stack trace into first line & rest
          let [
            _,
            solidityFirstLine,
            solidityRemaining,
          ] = solidityStackTrace.match(/^(.*?)\r?\n((.|\r|\n)*)$/);

          stackTrace = stackTrace.replace(
            /^.*/, //note that . does not include \n
            solidityRemaining //note: this does not end in \n, so no modification needed
          );
          e.hijackedMessage = e.message;
          e.message = solidityFirstLine;
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
  this.reject = rejectHijacker.bind(this);
  this.eventEmitter = eventEmitter;
  if (bugger) {
    this.debug = true;
  }
}

PromiEvent.resolve = Web3PromiEvent.resolve;

PromiEvent.prototype.setTransactionHash = function (txHash) {
  debug("setting!");
  debug("hash: %s", txHash);
  this.txHash = txHash;
};

module.exports = PromiEvent;
