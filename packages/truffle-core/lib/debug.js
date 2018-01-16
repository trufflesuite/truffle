var OS = require("os");
var expect = require("truffle-expect");
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var Debugger = require("truffle-debugger");

var commandReference = {
  "o": "step over",
  "i": "step into",
  "u": "step out",
  "n": "step next",
  ";": "step instruction",
  "p": "print instruction",
  "h": "print this help",
  "q": "quit"
};

var Debug = {
  // callback is function(err, Debugger, contexts)
  start: function(config, txHash, callback) {
    var bugger = new Debugger(config);

    bugger.start(txHash, function(err, contexts) {
      callback(err, bugger, contexts);
    });
  },

  gatherArtifacts: function(config) {
    return new Promise((accept, reject) => {
      // Gather all available contract artifacts
      dir.files(config.contracts_build_directory, (err, files) => {
        if (err) return reject(err);

        var contracts = files.filter((file_path) => {
          return path.extname(file_path) == ".json";
        }).map((file_path) => {
          return path.basename(file_path, ".json");
        }).map((contract_name) => {
          return config.resolver.require(contract_name);
        });

        async.each(contracts, (abstraction, finished) => {
          abstraction.detectNetwork().then(() => {
            finished();
          }).catch(finished);
        }, (err) => {
          if (err) return reject(err);
          accept(contracts.map( (contract) => {
            return {
              contractName: contract.contractName,
              source: contract.source,
              sourceMap: contract.sourceMap,
              sourcePath: contract.sourcePath,
              binary: contract.binary,
              deployedBinary: contract.deployedBinary,
              deployedSourceMap: contract.deployedSourceMap
            };
          }));
        });
      });
    });
  },

  formatStartMessage: function() {
    var lines = [
      "",
      "Note: This feature's in beta. " +
        "Please discuss any issues you find in our Gitter channel!",
      "https://gitter.im/ConsenSys/truffle",
      "",
      "Gathering transaction data...",
      ""
    ];

    return lines.join(OS.EOL);
  },

  formatCommandDescription: function(commandId) {
    return "(" + commandId + ") " + commandReference[commandId];
  },

  formatAffectedInstances: function(instances) {
    var hasAllSource = true;

    var lines = Object.keys(instances).map(function(address) {
      var instance = instances[address];

      if (instance.contractName) {
        return " " + address + " - " + instance.contractName;
      }

      if (!instance.source) {
        hasAllSource = false;
      }

      return " " + address + "(UNKNOWN)";
    });


    if (!hasAllSource) {
      lines.push("");
      lines.push("Warning: The source code for one or more contracts could not be found.");
    }

    return lines.join(OS.EOL);
  },

  formatHelp: function(lastCommand) {
    if (!lastCommand) {
      lastCommand = "n";
    }

    var prefix = [
      "Commands:",
      "(enter) last command entered (" + commandReference[lastCommand] + ")"
    ];

    var commandSections = [
      ["o", "i", "u", "n"],
      [";", "p", "h", "q"]
    ].map(function (shortcuts) {
      return shortcuts
        .map(Debug.formatCommandDescription)
        .join(", ");
    })

    var suffix = [
      ""
    ];

    var lines = prefix.concat(commandSections).concat(suffix);

    return lines.join(OS.EOL);
  },

  formatLineNumberPrefix: function (line, number, cols, tab) {
    if (!tab) {
      tab = "  ";
    }

    var prefix = number + "";
    while (prefix.length < cols) {
      prefix = " " + prefix;
    }

    prefix += ": ";
    return prefix + line.replace(/\t/g, tab);
  },

  formatLinePointer: function(line, startCol, endCol, padding, tab) {
    if (!tab) {
      tab = "  ";
    }

    padding += 2; // account for ": "
    var prefix = "";
    while (prefix.length < padding) {
      prefix += " ";
    }

    var output = "";
    for (var i = 0; i < line.length; i++) {
      var pointedAt = (i >= startCol && i < endCol);
      var isTab = (line[i] == "\t");

      var additional;
      if (isTab) {
        additional = tab;
      } else {
        additional = " "; // just a space
      }

      if (pointedAt) {
        additional = additional.replace(/./g, "^");
      }

      output += additional;
    }

    return prefix + output;
  },

  formatRangeLines: function(source, range, context) {
    var outputLines = [];

    // range is {
    //   start: { line, column },
    //   end: { line, column}
    // }
    //

    if (!context) {
      context = {
        before: 2,
        after: 2
      };
    };

    var startBeforeIndex = Math.max(
      range.start.line - context.before, 0
    );

    var endAfterIndex = Math.min(
      range.end.line + context.after, source.length - 1
    );

    var prefixLength = ((endAfterIndex + 1) + "").length;

    var beforeLines = source
      .filter(function (line, index) {
        return index >= startBeforeIndex && index < range.start.line
      })
      .map(function (line, index) {
        var number = startBeforeIndex + index + 1;  // zero-index
        return Debug.formatLineNumberPrefix(line, number, prefixLength)
      });

    var afterLines = source
      .filter(function (line, index) {
        return index <= endAfterIndex && index > range.end.line
      })
      .map(function (line, index) {
        var number = range.end.line + index + 1;
        return Debug.formatLineNumberPrefix(line, number, prefixLength)
      });

    var rangeLines = source
      .filter(function (line, index) {
        // TODO map function as written is trying to be fancy, but turns out
        // the approach looks like garbage. clean this up
        return index == range.start.line /*>= range.start.line && index <= range.end.line;*/
      })
      .map(function (line, index) {
        var number = range.start.line + index + 1; // zero-index

        var pointerStart;
        var pointerEnd;

        if (number - 1 == range.start.line) {
          // starting line for range: pointer starts at column
          pointerStart = range.start.column;
        } else {
          // otherwise pointer starts at first non-whitespace
          pointerStart = 0;
        }

        if (number - 1 == range.end.line) {
          // ending line for range: pointer ends at column
          pointerEnd = range.end.column;

        } else {
          // middle line for range - pointer fills line
          // TODO omit trailing whitespace (and/or line comments)
          pointerEnd = line.length;
        }

        return [
          Debug.formatLineNumberPrefix(line, number, prefixLength),
          Debug.formatLinePointer(line, pointerStart, pointerEnd, prefixLength)
        ];
      })
      .reduce(function (lines, pair) {
        // pair is prefixed line and pointer
        return lines.concat(pair);
      }, []);

    return beforeLines.concat(rangeLines).concat(afterLines).join(OS.EOL);
  },

  formatInstruction: function (traceIndex, instruction) {
    return (
      "(" + traceIndex + ") " +
        instruction.name + " " +
        (instruction.pushData || "")
    );
  },

  formatStack: function (stack) {
    var formatted = stack.map(function (item, index) {
      item = "  " + item;
      if (index == stack.length - 1) {
        item += " (top)";
      }

      return item;
    });

    if (stack.length == 0) {
      formatted.push("  No data on stack.");
    }

    return formatted.join(OS.EOL);
  }
};

module.exports = Debug;
