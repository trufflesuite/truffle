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
    var repl = require("repl");
    var OS = require("os");

    var config = Config.detect(options);

    Environment.detect(config, function(err) {
      if (err) return done(err);

      if (config._.length == 0) {
        return done(new Error("Please specify a transaction hash as the first parameter in order to debug that transaction. i.e., truffle debug 0x1234..."));
      }

      config.logger.log("The interactive debugger is a proof of concept and is only intended for use with Ganache." + OS.EOL + "Please report any issues to the Truffle dev team.");
      config.logger.log("");

      var tx_hash = config._[0];

      var bugger = new Debugger(config);

      bugger.start(tx_hash, function(err) {
        if (err) return done(err);

        var help = "Commands:" + OS.EOL + "(enter) step over, (i) step into, (o) step out, (n) step next, (;) step instruction" + OS.EOL + "(p) print instruction, (s) print stack information, (h) print this help, (q) quit";

        config.logger.log(help);
        config.logger.log("");

        function printLines(lineIndex, totalLines) {
          var source = bugger.getSource();
          var lines = source.split(OS.EOL)

          var startingLine = Math.max(lineIndex - totalLines + 1, 0);

          // Calculate prefix length
          var maxLineNumberLength = 0;
          for (var i = startingLine; i <= lineIndex; i++) {
            var lineNumber = i + 1;
            maxLineNumberLength = Math.max(maxLineNumberLength, (lineNumber + "").length);
          }

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

        function printState() {
          if (bugger.isStopped()) {
            config.logger.log("");
            config.logger.log("Execution stopped.");
            process.exit();
          }

          config.logger.log("")

          var range = bugger.currentInstruction.range;
          var source = bugger.getSource();
          var lines = source.split(OS.EOL)

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
        }

        printState();

        var cli = repl.start({
          prompt: "debug(" + config.network + ":" + tx_hash.substring(0, 10) + "...)> ",
          eval: function(cmd, context, filename, callback) {
            cmd = cmd.trim();

            if (cmd == ".exit") {
              cmd = "q";
            }

            if (cmd.length > 0) {
              cmd = cmd[0];
            }

            switch (cmd) {
              case "":
                bugger.stepOver();
                printState();
                break;
              case "i":
                bugger.stepInto();
                printState();
                break;
              case "o":
                bugger.stepOut();
                printState();
                break;
              case "n":
                bugger.step();
                printState();
                break;
              case "p":
                config.logger.log(JSON.stringify(bugger.currentInstruction, null, 2));
                printState();
                break;
              case ";":
                bugger.stepInstruction();
                config.logger.log(JSON.stringify(bugger.currentInstruction, null, 2));
                printState();
                break;
              case "q":
                process.exit();
                break;
              default:
                config.logger.log("")
                config.logger.log(help);
                config.logger.log("")
            }

            callback();
          }
        });

      });
    });
  }
}

module.exports = command;
