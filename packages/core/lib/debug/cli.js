const debugModule = require("debug");
const debug = debugModule("lib:debug:cli");

const ora = require("ora");

const Debugger = require("@truffle/debugger");
const DebugUtils = require("@truffle/debug-utils");
const Codec = require("@truffle/codec");

const { DebugInterpreter } = require("./interpreter");
const { DebugCompiler } = require("./compiler");
const { DebugExternalHandler } = require("./external");

class CLIDebugger {
  constructor(config, { compilations, txHash } = {}) {
    this.config = config;
    this.compilations = compilations;
    this.txHash = txHash;
  }

  async run() {
    this.config.logger.log("Starting Truffle Debugger...");

    // get compilations (either by shimming compiled artifacts,
    // or by doing a recompile)
    const compilations =
      this.compilations || (await this.getCompilations(this.config));

    // invoke @truffle/debugger
    const session = await this.startDebugger(compilations, this.txHash);

    // initialize prompt/breakpoints/ui logic
    const interpreter = await this.buildInterpreter(session, this.txHash);

    return interpreter;
  }

  async getCompilations() {
    const compilations = this.getProjectCompilations(this.config);
    if (!this.config.external) {
      return compilations;
    } else {
      const fetchSpinner = ora(
        "Getting and compiling external sources..."
      ).start();
      const {
        compilations: allCompilations,
        badAddresses,
        badFetchers
      } = new DebugExternalHandler(
        this.config,
        compilations,
        this.txHash
      ).getAllCompilations();
      if (badAddresses.length === 0 && badFetchers.length === 0) {
        fetchSpinner.succeed();
      } else {
        let warningStrings;
        if (badFetchers.length > 0) {
          warningStrings.push(
            `Errors occurred connecting to ${badFetchers.join(", ")}$.`
          );
        }
        if (badAddresses.length > 0) {
          warningStrings.push(
            `Errors occurred while getting sources for addresses ${badAddresses.join(
              ", "
            )}.`
          );
        }
        fetchSpinner.warn(warningStrings.join("  "));
      }
      return allCompilations;
    }
  }

  async getProjectCompilations() {
    let artifacts = await DebugUtils.gatherArtifacts(this.config);
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

  async startDebugger(compilations) {
    const startMessage = DebugUtils.formatStartMessage(
      this.txHash !== undefined
    );
    const startSpinner = ora(startMessage).start();

    const bugger =
      this.txHash !== undefined
        ? await Debugger.forTx(this.txHash, {
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

  async buildInterpreter(session) {
    return new DebugInterpreter(this.config, session, this.txHash);
  }
}

module.exports = {
  CLIDebugger
};
