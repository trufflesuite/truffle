const repl = require("repl");
const provision = require("@truffle/provisioner");
const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const contract = require("@truffle/contract");
const vm = require("vm");
const expect = require("@truffle/expect");
const TruffleError = require("@truffle/error");
const fse = require("fs-extra");
const path = require("path");
const EventEmitter = require("events");
const spawnSync = require("child_process").spawnSync;
const Require = require("@truffle/require");
const debug = require("debug")("console");
const { getCommand } = require("./command-utils");

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

    this.repl = null;
    // we need to keep tract of name conflicts that occur between contracts and
    // repl context objects so as not to overwrite them - this is to prevent
    // overwriting Node native objects like Buffer, number, etc.
    this.replContextNameConflicts = [];

    this.interfaceAdapter = createInterfaceAdapter({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
    this.web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
  }

  detectNameConflicts(abstractions) {
    for (const abstraction of abstractions) {
      if (
        Object.getOwnPropertyNames(this.repl.context.global).includes(
          abstraction.contract_name
        )
      ) {
        this.replContextNameConflicts.push(abstraction.contract_name);
      }
    }
  }

  async start() {
    try {
      // start the repl with an empty prompt and show a proper one when
      // the repl has set up its context and is ready to accept input
      this.repl = repl.start({
        prompt: "",
        eval: this.interpret.bind(this)
      });

      // Get and set Truffle and User Globals
      const truffleAndUserGlobals = await this.calculateTruffleAndUserGlobals();
      Object.entries(truffleAndUserGlobals).forEach(([key, value]) => {
        this.repl.context[key] = value;
      });

      // repl is ready - set and display prompt
      this.repl.setPrompt("truffle(" + this.options.network + ")> ");

      // hydrate the environment with the user's contracts
      this.provision(true);

      // provision first before displaying prompt so that if
      // there is a warning the user will end up at the prompt
      this.repl.displayPrompt();

      this.repl.on("exit", () => {
        process.exit();
      });

      // ensure that `await`-ing this method never resolves. (we want to keep
      // the console open until it exits on its own)
      return new Promise(() => {});
    } catch (error) {
      this.options.logger.log(
        "Unexpected error setting up the environment or provisioning " +
          "contracts while instantiating the console."
      );
      this.options.logger.log(error.stack || error.message || error);
    }
  }

  getUserDefinedGlobals({ accounts, interfaceAdapter, web3 }) {
    // exit if feature should be disabled
    if (this.options["require-none"]) return;

    // exit if no hydrate options are set
    if (
      (!this.options.console || !this.options.console.require) &&
      !this.options.require &&
      !this.options.r
    )
      return;

    const addToContext = (context, userData, namespace) => {
      for (const key in userData) {
        if (namespace) {
          if (typeof context[namespace] === "undefined") {
            context[namespace] = {};
          }
          context[namespace][key] = userData[key];
        } else {
          context[key] = userData[key];
        }
      }
    };
    const errorMessage =
      "You must specify the console.require property as " +
      "either a string or an array. If you specify an array, its members " +
      "must be paths or objects containing at least a `path` property.";

    const requireValue =
      this.options.r || this.options.require || this.options.console.require;

    // Require allows us to inject Truffle variables into the script's scope
    const requireOptions = {
      context: {
        accounts,
        interfaceAdapter,
        web3
      }
    };
    const userGlobals = {};
    if (typeof requireValue === "string") {
      requireOptions.file = requireValue;
      addToContext(userGlobals, Require.file(requireOptions));
    } else if (Array.isArray(requireValue)) {
      this.options.console.require.forEach(item => {
        if (typeof item === "string") {
          requireOptions.file = item;
          addToContext(userGlobals, Require.file(requireOptions));
        } else if (typeof item === "object" && item.path) {
          requireOptions.file = item.path;
          addToContext(userGlobals, Require.file(requireOptions), item.as);
        } else {
          throw new Error(errorMessage);
        }
      });
    } else {
      throw new Error(errorMessage);
    }
    return userGlobals;
  }

  async calculateTruffleAndUserGlobals() {
    let accounts;
    try {
      accounts = await this.interfaceAdapter.getAccounts();
    } catch {
      // don't prevent Truffle from working if user doesn't provide some way
      // to sign transactions (e.g. no reason to disallow debugging)
      accounts = [];
    }

    const userGlobals = this.getUserDefinedGlobals({
      web3: this.web3,
      interfaceAdapter: this.interfaceAdapter,
      accounts
    });

    const truffleGlobals = {
      web3: this.web3,
      interfaceAdapter: this.interfaceAdapter,
      accounts,
      artifacts: this.options.resolver
    };

    // we insert user variables first so as to not clobber Truffle's
    return {
      ...userGlobals,
      ...truffleGlobals
    };
  }

  provision(initialProvision = false) {
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
      const abstraction = contract(json);
      provision(abstraction, this.options);
      return abstraction;
    });

    if (initialProvision) {
      this.detectNameConflicts(abstractions);
    }

    this.resetContractsInConsoleContext(abstractions);
    return abstractions;
  }

  resetContractsInConsoleContext(abstractions) {
    abstractions = abstractions || [];

    const contextVars = {};

    abstractions.forEach(abstraction => {
      // don't overwrite Node's native objects - we detect name conflicts
      // on the first call to `provision`
      if (!this.replContextNameConflicts.includes(abstraction.contract_name)) {
        contextVars[abstraction.contract_name] = abstraction;
      }
    });

    if (this.replContextNameConflicts.length > 0) {
      const contractNames =
        this.replContextNameConflicts === 1
          ? this.replContextNameConflicts[0]
          : this.replContextNameConflicts.join(", ");
      console.log(
        `\n > Warning: One or more of your contract(s) has a name conflict ` +
          `with something in the current repl context and was not loaded by ` +
          `default. \n > You can use 'artifacts.require("<artifactName>")' ` +
          `to obtain a reference to your contract(s). \n > Truffle recommends ` +
          `that you rename your contract to avoid problems. \n > The following ` +
          `name conflicts exist: ${contractNames}.`
      );
    }

    // make sure the repl gets the new contracts in its context
    Object.keys(contextVars || {}).forEach(key => {
      this.repl.context[key] = contextVars[key];
    });
  }

  runSpawn(inputStrings, options) {
    let childPath;
    /* eslint-disable no-undef */
    if (typeof BUNDLE_CONSOLE_CHILD_FILENAME !== "undefined") {
      childPath = path.join(__dirname, BUNDLE_CONSOLE_CHILD_FILENAME);
    } else {
      childPath = path.join(__dirname, "../lib/console-child.js");
    }

    // stderr is piped here because we don't need to repeatedly see the parent
    // errors/warnings in child process - specifically the error re: having
    // multiple config files
    const spawnOptions = { stdio: ["inherit", "inherit", "pipe"] };
    const settings = ["config", "network", "url"]
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
      debug(spawnResult.stderr.toString());
    }

    // re-provision to ensure any changes are available in the repl
    this.provision();

    //display prompt when child repl process is finished
    this.repl.displayPrompt();
  }

  interpret(input, context, filename, callback) {
    // processInput returns a sanitized string
    const processedInput = processInput(input);
    if (
      getCommand({
        inputStrings: processedInput.split(" "),
        options: {},
        noAliases: this.options.noAliases
      }) !== null
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
    let includesAwait =
      /^\s*((?:(?:var|const|let)\s+)?[a-zA-Z_$][0-9a-zA-Z_$]*\s*=\s*)?(\(?\s*await[\s\S]*)/;

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

      //finally, if the assignment did not use var, const, or let, make sure to
      //return the result afterward
      if (assign) {
        const bareAssignmentMatch = assign.match(
          /^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*/
        );
        if (bareAssignmentMatch) {
          const varName = bareAssignmentMatch[1];
          assignment += varName;
        }
      }
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

const excludedCommands = new Set(["console", "db", "init", "watch", "develop"]);

module.exports = {
  excludedCommands,
  Console
};
