const Web3PromiEvent = require("web3-core-promievent");

function PromiEvent() {
  const { resolve, reject, eventEmitter } = Web3PromiEvent.apply(
    null,
    arguments
  );

  const originalStackTrace = new Error().stack;

  function rejectHijacker(e) {
    try {
      const stackTrace = originalStackTrace.replace(
        /^Error: \n/,
        e.stack.split("\n")[0]
      );

      e.hijackedStack = e.stack;
      e.stack = stackTrace;
    } catch (_) {
      // Ignore the case when the replacement fails
    }

    reject(e);
  }

  return {
    resolve,
    reject: rejectHijacker,
    eventEmitter
  };
}

PromiEvent.resolve = Web3PromiEvent.resolve;

module.exports = PromiEvent;
