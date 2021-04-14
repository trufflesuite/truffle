const repl = require("repl");
const Command = require("./command");
const provision = require("@truffle/provisioner");
const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const { contract } = require("@truffle/contract-constructor");
const vm = require("vm");
const expect = require("@truffle/expect");
const TruffleError = require("@truffle/error");
const fse = require("fs-extra");
const path = require("path");
const EventEmitter = require("events");
const spawnSync = require("child_process").spawnSync;

const processInput = input => {
  const inputComponents = input.trim().split(" ");
  if (inputComponents.length === 0) return input;

  if (inputComponents[0] === "truffle") {
    return inputComponents.slice(1).join(" ");
  }
  return input.trim();
};

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

    this.command = new Command(tasks);

    this.repl = null;

    this.interfaceAdapter = createInterfaceAdapter({
      provider: options.provider,
      networkType: options.networks[options.network].type,
      network_config: options.network_config
    });
    // TODO BGC Stop this with tezos
    this.web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
  }

  async start() {
    try {
      this.repl = repl.start({
        prompt: "truffle(" + this.options.network + ")> ",
        eval: this.interpret.bind(this)
      });

      let accounts;
      try {
        accounts = await this.interfaceAdapter.getAccounts();
      } catch {
        // don't prevent Truffle from working if user doesn't provide some way
        // to sign transactions (e.g. no reason to disallow debugging)
        accounts = [];
      }

      this.repl.context.web3 = this.web3;
      this.repl.context.interfaceAdapter = this.interfaceAdapter;
      this.repl.context.accounts = accounts;
      this.provision();

      //want repl to exit when it receives an exit command
      this.repl.on("exit", () => {
        process.exit();
      });

      // ensure that `await`-ing this method never resolves. (we want to keep
      // the console open until it exits on its own)
      return new Promise(() => {});
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
      const unfilteredFiles = fse.readdirSync(
        this.options.contracts_build_directory
      );
      files = unfilteredFiles.filter(file => file.endsWith(".json"));
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
      const abstraction = contract(json, this.options);
      if (json.architecture != "tezos") {
        provision(abstraction, this.options);
      }
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

    // make sure the repl gets the new contracts in its context
    Object.keys(contextVars || {}).forEach(key => {
      this.repl.context[key] = contextVars[key];
    });
  }

  runSpawn(inputStrings, options) {
    let childPath;
    if (typeof BUNDLE_CONSOLE_CHILD_FILENAME !== "undefined") {
      childPath = path.join(__dirname, BUNDLE_CONSOLE_CHILD_FILENAME);
    } else {
      childPath = path.join(__dirname, "../lib/console-child.js");
    }

    // stderr is piped here because we don't need to repeatedly see the parent
    // errors/warnings in child process - specifically the error re: having
    // multiple config files
    const spawnOptions = { stdio: ["inherit", "inherit", "pipe"] };
    const settings = ["config", "network"]
      .filter(setting => options[setting])
      .map(setting => `--${setting} ${options[setting]}`)
      .join(" ");

    const spawnInput = `${settings} -- ${inputStrings}`;

    const spawnResult = spawnSync(
      "node",
      ["--no-deprecation", childPath, spawnInput],
      spawnOptions
    );

    if (spawnResult.stderr) {
      // Theoretically stderr can contain multiple errors.
      // So let's just print it instead of throwing through
      // the error handling mechanism. Bad call?
      console.log(spawnResult.stderr.toString());
    }

    // re-provision to ensure any changes are available in the repl
    this.provision();

    //display prompt when child repl process is finished
    this.repl.displayPrompt();
  }

  interpret(input, context, filename, callback) {
    const processedInput = processInput(input);
    if (
      this.command.getCommand(processedInput, this.options.noAliases) != null
    ) {
      try {
        this.runSpawn(processedInput, this.options);
      } catch (error) {
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
        return callback();
      } catch (error) {
        // Don't pass abstractions to the callback if they're there or else
        // they'll get printed in the repl.
        return callback(error);
      }
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

    const match = processedInput.match(includesAwait);
    let source = processedInput;
    let assignment = null;

    // If our code includes an await, add special processing to ensure it's evaluated properly.
    if (match) {
      let assign = match[1];

      const expression =
        match[2] && match[2].endsWith(";")
          ? // strip off trailing ";" to prevent the expression below from erroring
            match[2].slice(0, -1)
          : match[2];

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

      vm.createContext(context);
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
