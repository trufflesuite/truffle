var repl = require("repl");
var Command = require("./command");
var provision = require("truffle-provisioner");
var contract = require("truffle-contract");
var Web3 = require("web3");
var vm = require("vm");
var expect = require("truffle-expect");
var _ = require("lodash");
var TruffleError = require("truffle-error");
var fs = require("fs");
var os = require("os");
var path = require("path");
var stream = require("stream");


function TruffleInterpreter(tasks, options) {
  this.options = options;
  this.r = null;
  this.command = new Command(tasks);

  // wrap stdin for possible nested consoles
  var input = new stream.PassThrough();
  process.stdin.pipe(input);
  var output = new stream.PassThrough();
  output.pipe(process.stdout);

  this.input = input;
  this.output = output;
};

TruffleInterpreter.prototype.run = function(callback) {
  var self = this;
  var options = this.options;

  var web3 = new Web3();
  web3.setProvider(options.provider);

  this.provision(function(err, abstractions) {
    if (err) {
      options.logger.log("Unexpected error: Cannot provision contracts while instantiating the console.");
      options.logger.log(err.stack || err.message || err);
    }

    var prefix = "truffle(" + options.network + ")> ";

    try {
      self.r = repl.start({
        prompt: prefix,
        eval: self.interpret.bind(self),
        terminal: true,
        input: self.input,
        output: self.output
      });

      self.r.on("exit", function() {
        callback();
      });

      self.resetContractsInConsoleContext(abstractions);
      self.r.context.web3 = web3;

    } catch(e) {
      self.output.write(e.stack + os.EOL);
      callback(e);
    }
  });
};

TruffleInterpreter.prototype.provision = function(callback) {
  var self = this;

  fs.readdir(this.options.contracts_build_directory, function(err, files) {
    if (err) {
      // Error reading the build directory? Must mean it doesn't exist or we don't have access to it.
      // Couldn't provision the contracts if we wanted. It's possible we're hiding very rare FS
      // errors, but that's better than showing the user error messages that will be "build folder
      // doesn't exist" 99.9% of the time.
    }

    var promises = [];
    files = files || [];

    files.forEach(function(file) {
      promises.push(new Promise(function(accept, reject) {
        fs.readFile(path.join(self.options.contracts_build_directory, file), "utf8", function(err, body) {
          if (err) return reject(err);
          try {
            body = JSON.parse(body);
          } catch (e) {
            return reject(new Error("Cannot parse " + file + ": " + e.message));
          }

          accept(body);
        })
      }))
    });

    Promise.all(promises).then(function(json_blobs) {
      var abstractions = json_blobs.map(function(json) {
        var abstraction = contract(json);
        provision(abstraction, self.options);
        return abstraction;
      });

      self.resetContractsInConsoleContext(abstractions);

      callback(null, abstractions);
    }).catch(callback);
  });
};

TruffleInterpreter.prototype.resetContractsInConsoleContext = function(abstractions) {
  var self = this;

  abstractions = abstractions || []

  if (this.r != null) {
    abstractions.forEach(function(abstraction) {
      self.r.context[abstraction.contract_name] = abstraction;
    });
  }
}

TruffleInterpreter.prototype.interpret = function(cmd, context, filename, callback) {
  var self = this;

  process.stdin.unpipe(self.input);

  var originalCallback = callback;
  var repipeCallback = function(err) {
    process.stdin.pipe(self.input);
    return originalCallback(err);
  }
  callback = repipeCallback;

  if (this.command.getCommand(cmd.trim()) != null) {
    return this.command.run(cmd.trim(), this.options, function(err) {
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
      self.provision(function(err, abstractions) {
        // Don't pass abstractions to the callback if they're there or else
        // they'll get printed in the repl.
        callback(err);
      });
    });
  }

  var result;
  try {
    result = vm.runInContext(cmd, context, {
      displayErrors: false
    });
  } catch (e) {
    return callback(e);
  }

  // Resolve all promises. This will leave non-promises alone.
  Promise.resolve(result).then(function(res) { callback(null, res) }).catch(callback);
}

var Repl = {
  TruffleInterpreter: TruffleInterpreter,

  run: function(tasks, options, callback) {
    var self = this;

    expect.options(options, [
      "working_directory",
      "contracts_directory",
      "contracts_build_directory",
      "migrations_directory",
      "network",
      "network_id",
      "provider",
      "resolver",
      "build_directory"
    ]);

    var interpreter = new TruffleInterpreter(tasks, options);
    interpreter.run(callback);
  }
}

module.exports = Repl;
