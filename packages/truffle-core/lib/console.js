const ReplManager = require("./repl");
const Command = require("./command");
const provision = require("truffle-provisioner");
const contract = require("truffle-contract");
const { Web3Shim } = require("truffle-interface-adapter");
const vm = require("vm");
const expect = require("truffle-expect");
const TruffleError = require("truffle-error");
const fse = require("fs-extra");
const path = require("path");
const EventEmitter = require("events");

class Console extends EventEmitter {
  constructor(tasks, options) {
    super();
    EventEmitter.call(this);

    expect.options(options, [
      "working_directory",
      "contracts_directory",
      "contracts_build_directory",
      "migrations_directory",
      "networks",
      "network",
      "network_id",
      "provider",
      "resolver",
      "build_directory"
    ]);

    this.options = options;

    this.repl = options.repl || new ReplManager(options);
    this.command = new Command(tasks);

    this.web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });

    // Bubble the ReplManager's exit event
    this.repl.on("exit", () => this.emit("exit"));
  }

  start(callback) {
    if (!this.repl) this.repl = new Repl(this.options);

    // TODO: This should probalby be elsewhere.
    // It's here to ensure the repl manager instance gets
    // passed down to commands.
    this.options.repl = this.repl;

    try {
      this.web3.eth.getAccounts().then(fetchedAccounts => {
        const abstractions = this.provision();

        this.repl.start({
          prompt: "truffle(" + this.options.network + ")> ",
          context: {
            web3: this.web3,
            accounts: fetchedAccounts
          },
          interpreter: this.interpret.bind(this),
          done: callback
        });

        this.resetContractsInConsoleContext(abstractions);
      });
    } catch (error) {
      this.options.logger.log(
        "Unexpected error: Cannot provision contracts while instantiating the console."
      );
      this.options.logger.log(error.stack || error.message || error);
    }
  }

  provision() {
    let files;
    try {
      files = fse.readdirSync(this.options.contracts_build_directory);
    } catch (error) {
      // Error reading the build directory? Must mean it doesn't exist or we don't have access to it.
      // Couldn't provision the contracts if we wanted. It's possible we're hiding very rare FS
      // errors, but that's better than showing the user error messages that will be "build folder
      // doesn't exist" 99.9% of the time.
    }

    let jsonBlobs = [];
    files = files || [];

    files.forEach(file => {
      try {
        const body = fse.readFileSync(
          path.join(this.options.contracts_build_directory, file),
          "utf8"
        );
        jsonBlobs.push(JSON.parse(body));
      } catch (error) {
        throw new Error(`Error parsing or reading ${file}: ${error.message}`);
      }
    });

    const abstractions = jsonBlobs.map(json => {
      const abstraction = contract(json);
      provision(abstraction, this.options);
      return abstraction;
    });

    this.resetContractsInConsoleContext(abstractions);

    return abstractions;
  }

  resetContractsInConsoleContext(abstractions) {
    abstractions = abstractions || [];

    const contextVars = {};

    abstractions.forEach(abstraction => {
      contextVars[abstraction.contract_name] = abstraction;
    });

    this.repl.setContextVars(contextVars);
  }

  interpret(cmd, context, filename, callback) {
    if (this.command.getCommand(cmd.trim(), this.options.noAliases) != null) {
      return this.command.run(cmd.trim(), this.options, error => {
        if (error) {
          // Perform error handling ourselves.
          if (error instanceof TruffleError) {
            console.log(error.message);
          } else {
            // Bubble up all other unexpected errors.
            console.log(error.stack || error.toString());
          }
          return callback();
        }

        // Reprovision after each command as it may change contracts.
        try {
          this.provision();
          callback();
        } catch (error) {
          // Don't pass abstractions to the callback if they're there or else
          // they'll get printed in the repl.
          callback(error);
        }
      });
    }

    // Much of the following code is from here, though spruced up:
    // https://github.com/nfcampos/await-outside

    /*
    - allow whitespace before everything else
    - optionally capture `var|let|const <varname> = `
      - varname only matches if it starts with a-Z or _ or $
        and if contains only those chars or numbers
      - this is overly restrictive but is easier to maintain
    - capture `await <anything that follows it>`
    */
    let includesAwait = /^\s*((?:(?:var|const|let)\s+)?[a-zA-Z_$][0-9a-zA-Z_$]*\s*=\s*)?(\(?\s*await[\s\S]*)/;

    const match = cmd.match(includesAwait);
    let source = cmd;
    let assignment = null;

    // If our code includes an await, add special processing to ensure it's evaluated properly.
    if (match) {
      let assign = match[1];
      const expression = match[2];

      const RESULT = "__await_outside_result";

      // Wrap the await inside an async function.
      // Strange indentation keeps column offset correct in stack traces
      source = `(async function() { try { ${
        assign ? `global.${RESULT} =` : "return"
      } (
  ${expression.trim()}
  ); } catch(e) { global.ERROR = e; throw e; } }())`;

      assignment = assign
        ? `${assign.trim()} global.${RESULT}; void delete global.${RESULT};`
        : null;
    }

    const runScript = script => {
      const options = {
        displayErrors: true,
        breakOnSigint: true,
        filename: filename
      };
      return script.runInContext(context, options);
    };

    let script;
    try {
      const options = { displayErrors: true, lineOffset: -1 };
      script = vm.createScript(source, options);
    } catch (error) {
      // If syntax error, or similar, bail.
      return callback(error);
    }

    // Ensure our script returns a promise whether we're using an
    // async function or not. If our script is an async function,
    // this will ensure the console waits until that await is finished.
    Promise.resolve(runScript(script))
      .then(value => {
        // If there's an assignment to run, run that.
        if (assignment) return runScript(vm.createScript(assignment));
        return value;
      })
      .then(value => {
        // All good? Return the value (e.g., eval'd script or assignment)
        callback(null, value);
      })
      .catch(callback);
  }
}

module.exports = Console;
