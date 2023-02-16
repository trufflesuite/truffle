const repl = require("repl");
const provision = require("@truffle/provisioner");
const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const contract = require("@truffle/contract");
const os = require("os");
const vm = require("vm");
const expect = require("@truffle/expect");
const TruffleError = require("@truffle/error");
const fse = require("fs-extra");
const path = require("path");
const EventEmitter = require("events");
const { spawn } = require("child_process");
const Require = require("@truffle/require");
const debug = require("debug")("console");
const { parseQuotesAndEscapes } = require("./command-utils");
const {
  excludedTruffleConsoleCommands,
  validTruffleConsoleCommands
} = require("./commands/commands");

// Create an expression that returns a string when evaluated
// by the REPL
const makeIIFE = str => `(() => "${str}")()`;

const processInput = input => {
  const words = input.trim().split(/\s+/);

  // empty input
  if (words.length === 0) return input;

  // maybe truffle command
  if (words[0].toLowerCase() === "truffle") {
    const cmd = words[1];

    if (cmd === undefined) {
      return makeIIFE(
        `ℹ️ : 'Missing truffle command. Please include a valid truffle command.`
      );
    }

    const normalizedCommand = cmd.toLowerCase();
    const isExcludedInREPL =
      excludedTruffleConsoleCommands.includes(normalizedCommand);

    if (isExcludedInREPL) {
      return makeIIFE(
        `ℹ️ : '${words[0]} ${cmd}' is not allowed in Console environment.`
      );
    }

    if (!validTruffleConsoleCommands.includes(normalizedCommand)) {
      return makeIIFE(
        `ℹ️ : '${words[0]} ${cmd}' is not a valid truffle command.`
      );
    }

    return words.slice(1).join(" ");
  }

  // an expression
  return input.trim();
};

class Console extends EventEmitter {
  constructor(options) {
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
    // we need to keep track of name conflicts that occur between contracts and
    // repl context objects so as not to overwrite them - this is to prevent
    // overwriting Node native objects like Buffer, number, etc.
    this.replGlobals = new Set();
    this.knownReplNameConflicts = new Set();
    this.newReplNameConflicts = new Set();

    this.interfaceAdapter = createInterfaceAdapter({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
    this.web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
  }

  recordNameConflicts(abstractions) {
    for (const abstraction of abstractions) {
      const name = abstraction.contract_name;
      if (
        !this.knownReplNameConflicts.has(name) &&
        this.replGlobals.has(name)
      ) {
        this.newReplNameConflicts.add(name);
        this.knownReplNameConflicts.add(name);
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

      // record name conflicts to avoid clobbering globals with contracts
      this.replGlobals = new Set(
        Object.getOwnPropertyNames(this.repl.context.global)
      );

      // repl is ready - set and display prompt
      this.repl.setPrompt("truffle(" + this.options.network + ")> ");

      // hydrate the environment with the user's contracts
      this.provision();

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

  provision() {
    let files = [];
    let jsonBlobs = [];
    try {
      files = fse.readdirSync(this.options.contracts_build_directory);
    } catch (error) {
      // Error reading the build directory? Must mean it doesn't exist or we don't have access to it.
      // Couldn't provision the contracts if we wanted. It's possible we're hiding very rare FS
      // errors, but that's better than showing the user error messages that will be "build folder
      // doesn't exist" 99.9% of the time.
    }

    files.forEach(file => {
      // filter out non artifacts
      if (!file.endsWith(".json")) return;

      try {
        const body = fse.readFileSync(
          path.join(this.options.contracts_build_directory, file),
          "utf8"
        );
        const json = JSON.parse(body);
        // Artifacts may not contain metadata. For example, early Solidity versions as well as
        // Vyper contracts do not include metadata. Just push them to json blobs.
        if (json.metadata === undefined) {
          jsonBlobs.push(json);
        } else {
          // filter out Truffle's console.log. We don't want users to interact with in the REPL.
          // user contracts named console.log will be imported, and a warning will be issued.
          const metadata = JSON.parse(json.metadata);
          const sources = Object.keys(metadata.sources);
          if (
            sources.length > 1 ||
            (sources.length === 1 &&
              !sources.some(source => {
                return (
                  source === "truffle/console.sol" ||
                  source === "truffle/Console.sol"
                );
              }))
          ) {
            jsonBlobs.push(json);
          }
        }
      } catch (error) {
        throw new Error(`Error parsing or reading ${file}: ${error.message}`);
      }
    });

    const abstractions = jsonBlobs.map(json => {
      const abstraction = contract(json);
      provision(abstraction, this.options);
      return abstraction;
    });

    this.recordNameConflicts(abstractions);

    this.resetContractsInConsoleContext(abstractions);
    return abstractions;
  }

  resetContractsInConsoleContext(abstractions) {
    abstractions = abstractions || [];

    const contextVars = {};

    abstractions.forEach(abstraction => {
      const name = abstraction.contract_name;
      // don't overwrite Node's native objects - only load contracts
      // into the repl context when no conflict exists
      if (!this.knownReplNameConflicts.has(name)) {
        contextVars[name] = abstraction;
      }
    });

    if (this.newReplNameConflicts.size > 0) {
      const contractNames = [...this.newReplNameConflicts.keys()];
      this.newReplNameConflicts.clear();
      console.log(
        `\n > Warning: One or more of your contract(s) has a name conflict ` +
          `with something in the current repl context and was not loaded by ` +
          `default. \n > You can use 'artifacts.require("<artifactName>")' ` +
          `to obtain a reference to your contract(s). \n > Truffle recommends ` +
          `that you rename your contract to avoid problems. \n > The following ` +
          `name conflicts exist: ${contractNames.join(", ")}.\n`
      );
    }

    // make sure the repl gets the new contracts in its context
    Object.keys(contextVars || {}).forEach(key => {
      this.repl.context[key] = contextVars[key];
    });
  }

  async runSpawn(inputStrings, options) {
    let childPath;
    /* eslint-disable no-undef */
    if (typeof BUNDLE_CONSOLE_CHILD_FILENAME !== "undefined") {
      childPath = path.join(__dirname, BUNDLE_CONSOLE_CHILD_FILENAME);
    } else {
      childPath = path.join(__dirname, "../lib/console-child.js");
    }

    const spawnOptions = { stdio: "pipe" };
    const settings = ["config", "network", "url"]
      .filter(setting => options[setting])
      .map(setting => `--${setting} ${options[setting]}`)
      .join(" ");

    const spawnInput = `${settings} -- ${inputStrings}`;

    const spawnedProcess = spawn(
      "node",
      ["--no-deprecation", childPath, spawnInput],
      spawnOptions
    );

    // Theoretically stderr can contain multiple errors.
    // So let's just print it instead of throwing through
    // the error handling mechanism. Bad call? Who knows...
    // better be safe and buffer stderr so that it doesn't
    // interrupt stdout, and present it as a complete
    // string at the end of the spawned process.
    let bufferedError = "";
    spawnedProcess.stderr.on("data", data => {
      bufferedError += data.toString();
    });

    spawnedProcess.stdout.on("data", data => {
      // convert buffer to string
      data = data.toString();
      // workaround: remove extra newline in `truffle develop` console
      // truffle test, for some reason, appends a newline to the data
      // it emits here.
      if (data.endsWith(os.EOL)) data = data.slice(0, -os.EOL.length);
      console.log(data);
    });

    return new Promise((resolve, reject) => {
      spawnedProcess.on("close", code => {
        // dump bufferedError
        debug(bufferedError);

        if (!code) {
          // re-provision to ensure any changes are available in the repl
          this.provision();

          //display prompt when child repl process is finished
          this.repl.displayPrompt();
          return void resolve();
        }
        reject(code);
      });
    });
  }

  async interpret(input, context, filename, callback) {
    const processedInput = processInput(input);
    if (validTruffleConsoleCommands.includes(processedInput.split(/\s+/)[0])) {
      try {
        parseQuotesAndEscapes(processedInput); //we're just doing this to see
        //if it errors. unfortunately we need to throw out the result and recompute
        //it afterward (but the input string is probably short so it's OK).
        await this.runSpawn(processedInput, this.options);
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
    - optionally capture `var| let |const <varname> = `
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
      source = `(async function() { try {${
        assign ? `global.${RESULT} =` : "return"
      } (
          ${expression.trim()}
  ); } catch(e) {global.ERROR = e; throw e; } }())`;

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
        displayErrors: false,
        breakOnSigint: true,
        filename: filename
      };

      vm.createContext(context);
      return script.runInContext(context, options);
    };

    let script;
    try {
      const options = { lineOffset: -1 };
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

module.exports = {
  Console
};
