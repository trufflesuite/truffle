const debug = require("debug")("contract:promievent");
const DebugUtils = require("@truffle/debug-utils");
const Web3PromiEvent = require("web3-core-promievent");

function PromiEvent(justPromise, bugger, selectors) {
  //selectors are passed in separately because when I
  //try to import Debugger here I get a compile error
  const { resolve, reject, eventEmitter } = new Web3PromiEvent(justPromise);

  originalStackTrace = new Error().stack;

  function rejectHijacker(e) {
    debug("hijacking!");
    debug("hash: %s", this.txHash);
    let getSolidityStackTrace;
    if (bugger && this.txHash) {
      debug("debugging time!");
      getSolidityStackTrace = async () => {
        try {
          let session = bugger.connect();
          await session.load(this.txHash);
          await session.continueUntilBreakpoint();
          const report = session.view(selectors.stacktrace.current.finalReport);
          const rawMessage = session.view(
            selectors.evm.current.step.returnValue
          );
          await session.unload();
          //attempt to decode (not gonna try and use Truffle Codec in here, we don't
          //need anything that fancy here anyway)
          let message;
          const errorStringHash = "0x08c379a0";
          if (rawMessage.startsWith(errorStringHash)) {
            try {
              message = web3.eth.abi.decodeParameter(
                "string",
                rawMessage.slice(10) //10 = 2 + 2*4
              );
            } catch (_) {
              //if error, leave message undefined
            }
          }
          return DebugUtils.formatStacktrace(report, message, 4); //indent 4 to match node's stacktraces
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
      debug("solidityStackTrace: %s", solidityStackTrace);
      try {
        let stackTrace = originalStackTrace.replace(
          /^.*\n.*\n.*/, //replace first 3 lines; note that . does not include \n
          //we replace not just the first line but also the next 2 as they contain
          //useless stuff users shouldn't see
          e.stack.split("\n")[0]
        );
        if (solidityStackTrace) {
          //let's split the solidity stack trace into first line & rest
          let [
            _,
            solidityFirstLine,
            solidityRemaining
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
  this.reject = rejectHijacker;
  this.eventEmitter = eventEmitter;
  if (bugger) {
    this.debug = true;
  }
}

PromiEvent.resolve = Web3PromiEvent.resolve;

PromiEvent.prototype.setTransactionHash = function(txHash) {
  debug("setting!");
  debug("hash: %s", txHash);
  this.txHash = txHash;
};

module.exports = PromiEvent;
