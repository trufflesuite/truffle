const colors = require("colors");
const util = require("util");

const { CLIDebugger } = require("./cli");
const execute = require("@truffle/contract/lib/execute");

class CLIDebugHook {
  constructor(config, compilations, runner) {
    this.config = config;
    this.compilations = compilations;
    this.runner = runner; // mocha runner (**not** lib/test/testrunner)
  }

  async debug(operation) {
    // turn off timeouts for the current runnable
    // HACK we don't turn it back on because it doesn't work...
    // tests that take a long time _after_ debug break just won't timeout
    this.disableTimeout();

    const { txHash, result, method } = await this.invoke(operation);

    this.printStartTestHook(method);

    const interpreter = await new CLIDebugger(this.config, {
      compilations: this.compilations
    }).run(txHash);
    await interpreter.start();

    this.printStopTestHook();

    return result;
  }

  async start() {}

  disableTimeout() {
    this.runner.currentRunnable.timeout(0);
  }

  async invoke(operation) {
    const method = await this.detectMethod(operation);
    const { action } = method;

    switch (action) {
      case "deploy": {
        const result = await operation;

        return {
          txHash: result.transactionHash, // different name; who knew
          method,
          result
        };
      }
      case "send": {
        const result = await operation;

        return { txHash: result.tx, method, result };
      }
      case "call": {
        // replays as send
        const { contract, fn, abi, args, address } = method;

        // get the result of the call
        const result = await operation;

        // and replay it as a transaction so we can debug
        // bit of a HACK: properly making a call act like a tx requires forking
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
      for (let action of ["send", "call", "deploy"]) {
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

  printStartTestHook(method) {
    const formatOperation = ({
      action,
      contract: { contractName },
      abi,
      args
    }) => {
      switch (action) {
        case "deploy": {
          return colors.bold(
            `${contractName}.new(${args.map(util.inspect).join(", ")})`
          );
        }
        case "call":
        case "send": {
          return colors.bold(
            `${contractName}.${abi.name}(${args.map(util.inspect).join(", ")})`
          );
        }
      }
    };

    this.config.logger.log("");
    this.config.logger.log("  ...");
    this.config.logger.log(
      colors.cyan(
        ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      )
    );
    this.config.logger.log("  Test run interrupted.");
    this.config.logger.log(`  Debugging ${formatOperation(method)}`);
    this.config.logger.log(
      colors.cyan(
        ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      )
    );
    this.config.logger.log("");
  }

  printStopTestHook() {
    this.config.logger.log("");
    this.config.logger.log("");
    this.config.logger.log(
      colors.cyan(
        "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
      )
    );
    this.config.logger.log("  Debugger stopped. Test resuming");
    this.config.logger.log(
      colors.cyan(
        "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
      )
    );
    this.config.logger.log("  ...");
    this.config.logger.log("");
  }
}

module.exports = {
  CLIDebugHook
};
