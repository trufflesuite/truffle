const command = {
  command: "debug",
  description:
    "Interactively debug any transaction on the blockchain (experimental)",
  builder: {
    _: {
      type: "string"
    }
  },
  help: {
    usage: "truffle debug [<transaction_hash>]",
    options: [
      {
        option: "<transaction_hash>",
        description: "Transaction ID to use for debugging."
      }
    ]
  },
  run: function(options, done) {
    command
      .setupDebugger(options)
      .then(interpreter => interpreter.start(done))
      .catch(done);
  },
  setupDebugger: async function(options) {
    const debugModule = require("debug");
    const debug = debugModule("lib:commands:debug");
    const util = require("util");
    const BN = require("bn.js");
    const ora = require("ora");

    // add custom inspect options for BNs
    BN.prototype[util.inspect.custom] = function(depth, options) {
      return options.stylize(this.toString(), "number");
    };

    const compile = require("truffle-compile");
    const Config = require("truffle-config");
    const Debugger = require("truffle-debugger");
    const DebugUtils = require("truffle-debug-utils");
    const Environment = require("../environment");
    const { DebugInterpreter } = require("../debug");

    const config = Config.detect(options);

    config.logger.log("Starting Truffle Debugger...");

    await Environment.detect(config);

    const txHash = config._[0]; //may be undefined

    let startSpinner; //apologies for the use of a global variable here
    let compileSpinner; //and here

    const compilation = await new Promise(function(accept, reject) {
      //we need to set up a config object for the compiler.
      //it's the same as the existing config, but we turn on quiet.
      //unfortunately, we don't have Babel here, so cloning is annoying.
      let compileConfig = Object.assign(
        {},
        ...Object.entries(config).map(([key, value]) => ({ [key]: value }))
      ); //clone
      compileConfig.quiet = true;

      compileSpinner = ora("Compiling your contracts...").start();

      compile.all(compileConfig, function(err, contracts, files) {
        if (err) {
          return reject(err);
        }

        return accept({
          contracts: contracts,
          files: files
        });
      });
    });

    compileSpinner.succeed();

    let startMessage = DebugUtils.formatStartMessage(txHash !== undefined);
    startSpinner = ora(startMessage).start();

    let debuggerOptions = {
      provider: config.provider,
      files: compilation.files,
      contracts: Object.keys(compilation.contracts).map(function(name) {
        const contract = compilation.contracts[name];
        return {
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
        };
      })
    };

    const bugger =
      txHash !== undefined
        ? await Debugger.forTx(txHash, debuggerOptions)
        : await Debugger.forProject(debuggerOptions);

    debug("about to connect");
    const session = bugger.connect();

    const interpreter = new DebugInterpreter(
      config,
      session,
      startSpinner,
      txHash
    );

    return interpreter;
  }
};

module.exports = command;
