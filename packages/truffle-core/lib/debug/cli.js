const debugModule = require("debug");
const debug = debugModule("lib:debug:cli");

const util = require("util");

const BN = require("bn.js");
const ora = require("ora");

const Debugger = require("@truffle/debugger");
const DebugUtils = require("@truffle/debug-utils");

const { DebugInterpreter } = require("./interpreter");
const { DebugCompiler } = require("./compiler");
const { shimBytecode } = require("truffle-compile/legacy/shims");

class CLIDebugger {
  constructor(config, { compilation } = {}) {
    this.config = config;
    this.compilation = compilation;
  }

  async run(txHash) {
    this.config.logger.log("Starting Truffle Debugger...");

    // override BN display
    this._setupCustomInspect();

    // compile contracts
    const compilation = this.compilation || (await this.compileSources());

    // invoke @truffle/debugger
    const session = await this.startDebugger(compilation, txHash);

    // initialize prompt/breakpoints/ui logic
    const interpreter = await this.buildInterpreter(session, txHash);

    return interpreter;
  }

  async compileSources() {
    const compileSpinner = ora("Compiling your contracts...").start();

    const compilation = await new DebugCompiler(this.config).compile();

    compileSpinner.succeed();

    return compilation;
  }

  async startDebugger(compilation, txHash) {
    const startMessage = DebugUtils.formatStartMessage(txHash !== undefined);
    const startSpinner = ora(startMessage).start();

    let debuggerOptions = this.getDebuggerOptions(compilation);

    const bugger =
      txHash !== undefined
        ? await Debugger.forTx(txHash, debuggerOptions)
        : await Debugger.forProject(debuggerOptions);

    const session = bugger.connect();

    // check for error
    if (session.view(Debugger.selectors.session.status.isError)) {
      startSpinner.fail();
    } else {
      startSpinner.succeed();
    }

    return session;
  }

  getDebuggerOptions({ contracts, sourceIndexes }) {
    return {
      provider: this.config.provider,
      files: sourceIndexes,
      contracts: contracts.map(
        ({
          contractName,
          source,
          sourcePath,
          ast,
          bytecode,
          sourceMap,
          deployedBytecode,
          deployedSourceMap,
          compiler,
          abi
        }) => ({
          contractName,
          source,
          sourcePath,
          ast,
          binary: shimBytecode(bytecode),
          sourceMap,
          deployedBinary: shimBytecode(deployedBytecode),
          deployedSourceMap,
          compiler,
          abi
        })
      )
    };
  }

  async buildInterpreter(session, txHash) {
    return new DebugInterpreter(this.config, session, txHash);
  }

  _setupCustomInspect() {
    // add custom inspect options for BNs
    BN.prototype[util.inspect.custom] = function(depth, options) {
      return options.stylize(this.toString(), "number");
    };
  }
}

module.exports = {
  CLIDebugger
};
