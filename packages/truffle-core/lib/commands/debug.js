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

      var bugger = new Debugger(config);
      var lastCommand = "n";

      var commandReference = {
        "o": "step over",
        "i": "step into",
        "u": "step out",
        "n": "step next",
        ";": "step instruction",
        "p": "print instruction",
        "h": "print this help",
        "q": "quit"
      }

      function commandName(commandId) {
        return "(" + commandId + ") " + commandReference[commandId];
      };

      config.logger.log("Gathering transaction data...");
      config.logger.log("");

      bugger.start(tx_hash, function(err, contexts) {
        if (err) return done(err);

        function printAddressesAffected() {
          config.logger.log("Addresses affected:");

          var addresses = Object.keys(contexts).map(function(address) {
            var context = contexts[address];
            var contract = context.contract;
            return "  " + address + " - " + contract.contractName;
          });

          config.logger.log(addresses.join(OS.EOL));
        }

        function printHelp() {
          var help = "Commands:"
            + OS.EOL + "(enter) last command entered (" + commandReference[lastCommand] + ")"
            + OS.EOL + commandName("o") + ", " + commandName("i") + ", " + commandName("u") + ", " + commandName("n")
            + OS.EOL + commandName(";") + ", " + commandName("p") + ", " + commandName("h") + ", " + commandName("q");

          config.logger.log("")
          config.logger.log(help);
          config.logger.log("");
        }

        function printLines(lineIndex, totalLines) {
          var source = bugger.currentSource();
          var lines = source.split(OS.EOL)

          var startingLine = Math.max(lineIndex - totalLines + 1, 0);

          // Calculate prefix length
          var maxLineNumberLength = ((lineIndex + 1) + "").length;

          // Now print the lines
          for (var i = startingLine; i <= lineIndex; i++) {
            var lineNumber = i + 1;
            var line = lineNumber;

            while (line.length < maxLineNumberLength) {
              line = " " + line;
            }

            line += ": ";
            line += lines[i].replace(/\t/g, "  ")

            config.logger.log(line);
          }

          // Include colon and extra space.
          return maxLineNumberLength + 2;
        }

        function printFile() {
          config.logger.log("");
          var sourcePath = bugger.currentSourcePath();
          config.logger.log(path.basename(sourcePath) + ":");
        }

        function printState(started) {
          config.logger.log("");

          var range = bugger.currentInstruction().range;
          var source = bugger.currentSource();
          var lines = source.split(OS.EOL);

          var prefixLength = printLines(range.start.line, 3);

          var line = lines[range.start.line];

          var pointer = "";

          var column = 0;

          for (; column < range.start.column; column++) {
            if (line[column] == "\t") {
              pointer += "  ";
            } else {
              pointer += " ";
            }
          }

          pointer += "^";
          column += 1;

          var end_column = range.end.column;

          if (range.end.line != range.start.line) {
            end_column = line.length - 1;
          }

          for (; column < end_column; column++) {
            pointer += "^";
          }

          for (var i = 0; i < prefixLength; i++) {
            pointer = " " + pointer;
          }

          config.logger.log(pointer);
          config.logger.log("")
        }

        function printInstruction(instruction) {
          var step = bugger.currentStep();

          var stack = step.stack.map(function(item, index) {
            var stackItem = "  " + item;

            if (index == step.stack.length - 1) {
              stackItem += " (top)";
            }

            return stackItem;
          });

          if (stack.length == 0) {
            stack.push("  No data on stack.");
          }

          config.logger.log("");
          config.logger.log("(" + bugger.traceIndex + ") " + instruction.name + " " + (instruction.pushData || ""));
          config.logger.log(stack.join(OS.EOL));
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
              printInstruction(bugger.currentInstruction());
              printState();
              break;
            case "o":
            case "i":
            case "u":
            case "n":
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
