const debugModule = require("debug");
const debug = debugModule("lib:debug:cli");

const util = require("util");

const BN = require("bn.js");
const ora = require("ora");

const Debugger = require("truffle-debugger");
const DebugUtils = require("truffle-debug-utils");

const { DebugInterpreter } = require("./interpreter");
const { DebugCompiler } = require("./compiler");

class CLIDebugger {
  constructor(config, { compilation }) {
    this.config = config;
    this.compilation = compilation;
  }

  async run(txHash) {
    this.config.logger.log("Starting Truffle Debugger...");

    // override BN display
    this._setupCustomInspect();

    // compile contracts
    const compilation = this.compilation || (await this.compileSources());

    // invoke truffle-debugger
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

  getDebuggerOptions({ files, contracts }) {
    return {
      provider: this.config.provider,
      files,
      contracts: Object.values(contracts).map(contract => ({
        contractName: contract.contractName || contract.contract_name,
        source: contract.source,
        sourcePath: contract.sourcePath,
        ast: contract.ast,
        binary: contract.binary || contract.bytecode,
        sourceMap: contract.sourceMap,
        deployedBinary: contract.deployedBinary || contract.deployedBytecode,
        deployedSourceMap: contract.deployedSourceMap,
        compiler: contract.compiler,
        abi: contract.abi
      }))
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
