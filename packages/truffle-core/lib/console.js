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

    var self = this;

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
    this.repl.on("exit", function() {
      self.emit("exit");
    });
  }

  start(callback) {
    var self = this;

    if (!this.repl) {
      this.repl = new Repl(this.options);
    }

    // TODO: This should probalby be elsewhere.
    // It's here to ensure the repl manager instance gets
    // passed down to commands.
    this.options.repl = this.repl;

    this.provision()
      .then(abstractions => {
        self.repl.start({
          prompt: "truffle(" + self.options.network + ")> ",
          context: {
            web3: self.web3
          },
          interpreter: self.interpret.bind(self),
          done: callback
        });

        self.resetContractsInConsoleContext(abstractions);
      })
      .catch(error => {
        self.options.logger.log(
          "Unexpected error: Cannot provision contracts while instantiating the console."
        );
        self.options.logger.log(error.stack || error.message || error);
      });
  }

  async provision() {
    let files;
    try {
      files = fse.readdirSync(this.options.contracts_build_directory);
    } catch (error) {
      // Error reading the build directory? Must mean it doesn't exist or we don't have access to it.
      // Couldn't provision the contracts if we wanted. It's possible we're hiding very rare FS
      // errors, but that's better than showing the user error messages that will be "build folder
      // doesn't exist" 99.9% of the time.
    }

    let promises = [];
    files = files || [];

    files.forEach(file => {
      promises.push(
        fse
          .readFile(
            path.join(this.options.contracts_build_directory, file),
            "utf8"
          )
          .then(body => JSON.parse(body))
          .catch(error => {
            throw new Error(
              `Error parsing or reading ${file}: ${error.message}`
            );
          })
      );
    });

    const jsonBlobs = await Promise.all(promises);
    const abstractions = jsonBlobs.map(json => {
      const abstraction = contract(json);
      provision(abstraction, this.options);
      return abstraction;
    });

    this.resetContractsInConsoleContext(abstractions);

    return abstractions;
  }

  resetContractsInConsoleContext(abstractions) {
    var self = this;

    abstractions = abstractions || [];

    var contextVars = {};

    abstractions.forEach(function(abstraction) {
      contextVars[abstraction.contract_name] = abstraction;
    });

    self.repl.setContextVars(contextVars);
  }

  interpret(cmd, context, filename, callback) {
    var self = this;

    if (this.command.getCommand(cmd.trim(), this.options.noAliases) != null) {
      return self.command.run(cmd.trim(), this.options, function(err) {
        if (err) {
          // Perform error handling ourselves.
          if (err instanceof TruffleError) {
            console.log(err.message);
          } else {
            // Bubble up all other unexpected errors.
            console.log(err.stack || err.toString());
          }
          return callback();
        }

        // Reprovision after each command as it may change contracts.
        self
          .provision()
          .then(() => callback())
          .catch(error => {
            // Don't pass abstractions to the callback if they're there or else
            // they'll get printed in the repl.
            callback(error);
          });
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

    var match = cmd.match(includesAwait);
    var source = cmd;
    var assignment = null;

    // If our code includes an await, add special processing to ensure it's evaluated properly.
    if (match) {
      var assign = match[1];
      var expression = match[2];

      var RESULT = "__await_outside_result";

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

    var runScript = function(s) {
      const options = {
        displayErrors: true,
        breakOnSigint: true,
        filename: filename
      };
      return s.runInContext(context, options);
    };

    try {
      const options = { displayErrors: true, lineOffset: -1 };
      var script = vm.createScript(source, options);
    } catch (e) {
      // If syntax error, or similar, bail.
      return callback(e);
    }

    // Ensure our script returns a promise whether we're using an
    // async function or not. If our script is an async function,
    // this will ensure the console waits until that await is finished.
    Promise.resolve(runScript(script))
      .then(function(value) {
        // If there's an assignment to run, run that.
        if (assignment) {
          return runScript(vm.createScript(assignment));
        } else {
          return value;
        }
      })
      .then(function(value) {
        // All good? Return the value (e.g., eval'd script or assignment)
        callback(null, value);
      })
      .catch(callback);
  }
}

module.exports = Console;
