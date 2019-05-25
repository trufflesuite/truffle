const { CLIDebugger } = require("./cli");
const { DebugPrinter } = require("./printer");

class CLIDebugHook {
  constructor(config, runner) {
    this.config = config;
    this.runner = runner; // mocha runner (**not** lib/test/testrunner)
    this.printer = new DebugPrinter(config);
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

    this.printer.printStartTestHook({ contractName, methodName, args });

    const interpreter = await new CLIDebugger(this.config).run(txHash);
    await interpreter.start();

    this.printer.printStopTestHook(operation.method);

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
        const { tx: txHash } = result;

        return { txHash, method, result };
      }
      default: {
        throw new Error(`Unsupported action for debugging: ${action}`);
      }
    }
  }

  detectMethod(promiEvent) {
    return new Promise(accept => {
      promiEvent.on("execute:send:method", ({ abi, args, contract }) => {
        accept({
          abi,
          args,
          contract,
          action: "send"
        });
      });
    });
  }
}

module.exports = {
  CLIDebugHook
};
