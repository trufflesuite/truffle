const { CLIDebugger } = require("./cli");
const execute = require("truffle-contract/lib/execute");

class CLIDebugHook {
  constructor(config, runner) {
    this.config = config;
    this.runner = runner; // mocha runner (**not** lib/test/testrunner)
  }

  async debug(operation) {
    // turn off timeouts for the current runnable
    // HACK we don't turn it back on because it doesn't work...
    // tests that take a long time _after_ debug break just won't timeout
    this.disableTimeout();

    const {
      txHash,
      result,
      method: {
        abi: { name: methodName },
        args,
        contract: { contractName }
      }
    } = await this.invoke(operation);


    this.config.logger.log("");
    const interpreter = await new CLIDebugger(this.config).run(txHash);
    await interpreter.start();
    this.config.logger.log("");

    return result;
  }

  disableTimeout() {
    this.runner.currentRunnable.timeout(0);
  }

  async invoke(operation) {
    const method = await this.detectMethod(operation);
    const { action } = method;

    switch (action) {
      case "send": {
        const result = await operation;

        return { txHash: result.tx, method, result };
      }
      case "call": {
        const { contract, fn, abi, args, address } = method;

        // get the result of the call
        const result = await operation;

        // and replay it as a transaction so we can debug
        const { tx: txHash } = await execute.send.call(
          contract,
          fn,
          abi,
          address
        )(...args);

        return { txHash, method, result };
      }
      default: {
        throw new Error(`Unsupported action for debugging: ${action}`);
      }
    }
  }

  detectMethod(promiEvent) {
    return new Promise(accept => {
      for (let action of ["send", "call"]) {
        promiEvent.on(
          `execute:${action}:method`,
          ({ fn, abi, args, contract, address }) => {
            accept({
              fn,
              abi,
              args,
              address,
              contract,
              action
            });
          }
        );
      }
    });
  }
}

module.exports = {
  CLIDebugHook
};
