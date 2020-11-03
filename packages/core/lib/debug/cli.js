const debugModule = require("debug");
const debug = debugModule("lib:debug:cli");

const ora = require("ora");
const fs = require("fs-extra");
const path = require("path");

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

    const session = await this.connect();

    // initialize prompt/breakpoints/ui logic
    const interpreter = await this.buildInterpreter(session);

    return interpreter;
  }

  async connect() {
    // get compilations (either by shimming compiled artifacts,
    // or by doing a recompile)
    const compilations = this.compilations || (await this.getCompilations());

    // invoke @truffle/debugger
    const session = await this.startDebugger(compilations);

    return session;
  }

  async fetchExternalSources(bugger) {
    const fetchSpinner = ora(
      "Getting and compiling external sources..."
    ).start();
    const { badAddresses, badFetchers } = await new DebugExternalHandler(
      bugger,
      this.config
    ).fetch(); //note: mutates bugger!
    if (badAddresses.length === 0 && badFetchers.length === 0) {
      fetchSpinner.succeed();
    } else {
      let warningStrings = [];
      if (badFetchers.length > 0) {
        warningStrings.push(
          `Errors occurred connecting to ${badFetchers.join(", ")}.`
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
  }

  async getCompilations() {
    let artifacts;
    artifacts = await this.gatherArtifacts();
    if (artifacts) {
      let shimmedCompilations = Codec.Compilations.Utils.shimArtifacts(
        artifacts
      );
      //if they were compiled simultaneously, yay, we can use it!
      if (shimmedCompilations.every(DebugUtils.isUsableCompilation)) {
        return shimmedCompilations;
      }
    }
    //if not, or if build directory doens't exist, we have to recompile
    return await this.compileSources();
  }

  async compileSources() {
    const compileSpinner = ora("Compiling your contracts...").start();

    const compilationResult = await new DebugCompiler(this.config).compile();
    debug("compilationResult: %O", compilationResult);

    compileSpinner.succeed();

    return Codec.Compilations.Utils.shimCompilations(compilationResult);
  }

  async startDebugger(compilations) {
    const startMessage = DebugUtils.formatStartMessage(
      this.txHash !== undefined
    );
    debug("starting debugger");
    let startSpinner;
    if (!this.config.fetchExternal) {
      //in external mode spinner is handled below
      startSpinner = ora(startMessage).start();
    }

    //note that in external mode we start in light mode
    //and only wake up to full mode later!
    //note: if we are in external mode, txHash had better be defined!
    //(this is ensured by commands/debug.js, so we don't check it ourselves)
    const bugger = await Debugger.forProject({
      provider: this.config.provider,
      compilations,
      lightMode: this.config.fetchExternal
    });
    if (this.txHash !== undefined) {
      try {
        debug("loading %s", this.txHash);
        await bugger.load(this.txHash);
      } catch (_) {
        debug("loading error");
        //on failure, stay unloaded
        //(note we handle failing the spinner below rather than here)
      }
    }

    debug("debugger started");

    if (!this.config.fetchExternal) {
      // check for error
      if (bugger.view(Debugger.selectors.session.status.isError)) {
        startSpinner.fail();
      } else {
        startSpinner.succeed();
      }
    } else {
      debug("about to fetch external sources");
      await this.fetchExternalSources(bugger); //note: mutates bugger!
      startSpinner = ora(startMessage).start();
      await bugger.startFullMode();
      if (bugger.view(Debugger.selectors.session.status.isError)) {
        startSpinner.fail();
      } else {
        startSpinner.succeed();
      }
    }

    return bugger;
  }

  async buildInterpreter(session) {
    return new DebugInterpreter(this.config, session, this.txHash);
  }

  async gatherArtifacts() {
    // Gather all available contract artifacts
    // if build directory doesn't exist, return undefined to signal that
    // a recompile is necessary
    if (!fs.existsSync(this.config.contracts_build_directory)) {
      return undefined;
    }
    const files = fs.readdirSync(this.config.contracts_build_directory);

    let contracts = files
      .filter(filePath => {
        return path.extname(filePath) === ".json";
      })
      .map(filePath => {
        return path.basename(filePath, ".json");
      })
      .map(contractName => {
        return this.config.resolver.require(contractName);
      });

    await Promise.all(
      contracts.map(abstraction => abstraction.detectNetwork())
    );

    return contracts;
  }
}

module.exports = {
  CLIDebugger
};
