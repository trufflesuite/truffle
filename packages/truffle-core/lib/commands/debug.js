var command = {
  command: 'debug',
  description: 'Interactively debug any transaction on the blockchain (experimental)',
  builder: {
    _: {
      type: "string"
    }
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Debugger = require("truffle-debugger");
    var DebugUtils = require("truffle-debug-utils");
    var Environment = require("../environment");
    var ReplManager = require("../repl");
    var OS = require("os");
    var path = require("path");

    var config = Config.detect(options);

    Environment.detect(config, function(err) {
      if (err) return done(err);

      if (config._.length == 0) {
        return done(new Error("Please specify a transaction hash as the first parameter in order to debug that transaction. i.e., truffle debug 0x1234..."));
      }

      var tx_hash = config._[0];

      var lastCommand = "n";

      config.logger.log(DebugUtils.formatStartMessage());

      var bugger = new Debugger(config);

      bugger.start(tx_hash, function(err, contexts) {
        if (err) return done(err);

        function splitLines(str) {
          // We were splitting on OS.EOL, but it turns out on Windows,
          // in some environments (perhaps?) line breaks are still denoted by just \n
          return str.split(/\r?\n/g);
        }

        function printAddressesAffected() {
          config.logger.log("Addresses affected:");
          config.logger.log(DebugUtils.formatAffectedInstances(contexts));
        }

        function printHelp() {
          config.logger.log("");
          config.logger.log(DebugUtils.formatHelp());
        }

        function printFile() {
          var message = "";

          var sourcePath = bugger.currentSourcePath();

          if (sourcePath) {
            message += path.basename(sourcePath);
          } else {
            message += "?";
          }

          var address = bugger.currentAddress();

          if (address) {
            message += " | " + address;
          }

          config.logger.log("");
          config.logger.log(message + ":");
        }

        function printState() {
          var source = bugger.currentSource();

          if (!source) {
            config.logger.log()
            config.logger.log("1: // No source code found.");
            config.logger.log("");
            return;
          }

          var lines = splitLines(source);
          var range = bugger.currentInstruction().range;

          config.logger.log("");

          config.logger.log(
            DebugUtils.formatRangeLines(lines, range, {before: 2, after: 0})
          );

          config.logger.log("");
        }

        function printInstruction() {
          var instruction = bugger.currentInstruction();
          var step = bugger.currentStep();

          var stack = DebugUtils.formatStack(step.stack);

          config.logger.log("");
          config.logger.log(
            DebugUtils.formatInstruction(bugger.traceIndex, instruction)
          );
          config.logger.log(stack);
        };

        function interpreter(cmd, context, filename, callback) {
          cmd = cmd.trim();

          if (cmd == ".exit") {
            cmd = "q";
          }

          if (cmd.length > 0) {
            cmd = cmd[0];
          }

          if (cmd == "") {
            cmd = lastCommand;
          }

          // Perform commands that require state changes.
          switch (cmd) {
            case "o":
              bugger.stepOver();
              break;
            case "i":
              bugger.stepInto();
              break;
            case "u":
              bugger.stepOut();
              break;
            case "n":
              bugger.step();
              break;
            case ";":
              bugger.advance();
              break;
            case "q":
              return repl.stop(callback);
          }

          // Check if execution has stopped.
          if (bugger.isStopped()) {
            config.logger.log("");
            if (bugger.isRuntimeError()) {
              config.logger.log("Transaction halted with a RUNTIME ERROR.")
              config.logger.log("");
              config.logger.log("This is likely due to an intentional halting expression, like assert(), require() or revert(). It can also be due to out-of-gas exceptions. Please inspect your transaction parameters and contract code to determine the meaning of this error.");
              return repl.stop(callback);
            } else {
              config.logger.log("Transaction completed successfully.");
              return repl.stop(callback);
            }
          }

          // Perform post printing
          // (we want to see if execution stopped before printing state).
          switch (cmd) {
            case ";":
            case "p":
              printFile();
              printInstruction();
              printState();
              break;
            case "o":
            case "i":
            case "u":
            case "n":
              if (bugger.currentSource() == null) {
                printInstruction();
              }

              printFile();
              printState();
              break;
            default:
              printHelp();
          }

          if (cmd != "i" && cmd != "u" && cmd != "h" && cmd != "p") {
            lastCommand = cmd;
          }

          callback();
        };

        printAddressesAffected();
        printHelp();
        printFile();
        printState();

        var repl = options.repl || new ReplManager(config);

        repl.start({
          prompt: "debug(" + config.network + ":" + tx_hash.substring(0, 10) + "...)> ",
          interpreter: interpreter
        });

        // Call the done function even though the repl hasn't finished.
        // This leaves the process at the whim of the repl; the repl is
        // responsible for closing the process when done.
        done();
      });
    });
  }
}

module.exports = command;
