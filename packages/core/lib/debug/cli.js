const debugModule = require("debug");
const debug = debugModule("lib:debug:cli");

const ora = require("ora");

const Debugger = require("@truffle/debugger");
const DebugUtils = require("@truffle/debug-utils");
const Codec = require("@truffle/codec");

const { DebugInterpreter } = require("./interpreter");
const { DebugCompiler } = require("./compiler");

class CLIDebugger {
  constructor(config, { compilations } = {}) {
    this.config = config;
    this.compilations = compilations;
  }

  //note: txHash is optional
  async run(txHash) {
    this.config.logger.log("Starting Truffle Debugger...");

    // get compilations (either by shimming compiled artifacts,
    // or by doing a recompile)
    const compilations =
      this.compilations || (await this.getCompilations(this.config));

    // invoke @truffle/debugger
    const session = await this.startDebugger(compilations, txHash);

    // initialize prompt/breakpoints/ui logic
    const interpreter = await this.buildInterpreter(session, txHash);

    return interpreter;
  }

  async getCompilations(config) {
    let artifacts = await DebugUtils.gatherArtifacts(config);
    let shimmedCompilations = Codec.Compilations.Utils.shimArtifacts(artifacts);
    //if they were compiled simultaneously, yay, we can use it!
    if (shimmedCompilations.every(DebugUtils.isUsableCompilation)) {
      return shimmedCompilations;
    }
    //if not, we have to recompile
    let { contracts, files } = await this.compileSources();
    return Codec.Compilations.Utils.shimArtifacts(contracts, files);
  }

  async compileSources() {
    const compileSpinner = ora("Compiling your contracts...").start();

    const compilationResult = await new DebugCompiler(this.config).compile();
    debug("compilationResult: %O", compilationResult);

    compileSpinner.succeed();

    return {
      contracts: compilationResult.contracts,
      files: compilationResult.sourceIndexes
    };
  }

  async startDebugger(compilations, txHash) {
    const startMessage = DebugUtils.formatStartMessage(txHash !== undefined);
    const startSpinner = ora(startMessage).start();

    const bugger =
      txHash !== undefined
        ? await Debugger.forTx(txHash, {
            provider: this.config.provider,
            compilations
          })
        : await Debugger.forProject({
            provider: this.config.provider,
            compilations
          });

    // check for error
    if (bugger.view(Debugger.selectors.session.status.isError)) {
      startSpinner.fail();
    } else {
      startSpinner.succeed();
    }

    return bugger;
  }

  async buildInterpreter(session, txHash) {
    return new DebugInterpreter(this.config, session, txHash);
  }
}

module.exports = {
  CLIDebugger
};
