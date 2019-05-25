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

    const txHash = await this.invoke(method, ...args);

    this.config.logger.log("");
    const interpreter = await new CLIDebugger(this.config).run(txHash);
    await interpreter.start();
    this.config.logger.log("");
  }

  disableTimeout() {
    this.runner.currentRunnable.timeout(0);
  }

  async invoke(method, ...args) {
    if (method) {
      if (method) {
        const { tx } = await method.sendTransaction(...args);
        return tx;
      }
    }
  }
}

module.exports = {
  CLIDebugHook
};
