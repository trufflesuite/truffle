const { CLIDebugger } = require("./cli");

class CLIDebugHook {
  constructor(config, runner) {
    this.config = config;
    this.runner = runner; // mocha runner (**not** lib/test/testrunner)
  }

  async debug(method, ...args) {
    // turn off timeouts for the current runnable
    // HACK we don't turn it back on because it doesn't work...
    // tests that take a long time _after_ debug break just won't timeout
    this.disableTimeout();

    const { txHash, result } = await this.invoke(method, ...args);

    this.config.logger.log("");
    const interpreter = await new CLIDebugger(this.config).run(txHash);
    await interpreter.start();
    this.config.logger.log("");

    return result;
  }

  disableTimeout() {
    this.runner.currentRunnable.timeout(0);
  }

  async invoke(method, ...args) {
    if (method && typeof method.on === "function") {
      return await this.catchPromiEvent(method);
    } else if (method) {
      const result = await method.sendTransaction(...args);
      const { tx: txHash } = result;

      return { txHash, result };
    }
  }

  catchPromiEvent(promiEvent) {
    return new Promise((accept, reject) => {
      promiEvent.on("methodTransaction", info => {
        promiEvent
          .then(result => {
            const { tx: txHash } = result;

            accept({ txHash, info, result });
          })
          .catch(reject);
      });
    });
  }
}

module.exports = {
  CLIDebugHook
};
