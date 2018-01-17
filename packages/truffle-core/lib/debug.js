var OS = require("os");
var expect = require("truffle-expect");
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var Debugger = require("truffle-debugger");
var debug = require("debug")("lib:debug");

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
  // callback :: function(err, Session)
  start: function(config, txHash, callback) {
    expect.options(config, [
      "provider",
      "resolver"
    ]);

    var session;

    Debug.gatherArtifacts(config)
      .then(function(contracts) {
        return Debugger.forTx(txHash, {
          provider: config.provider,
          contracts: contracts
        });
      })
      .then(function (bugger) {
        return bugger.connect();
      })
      .then(function (instance) {
        session = instance;
      })
      .catch(callback)
      .then(function() {
        callback(null, session);
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

  formatRangeLines: function(source, range, contextBefore) {
    var outputLines = [];

    // range is {
    //   start: { line, column },
    //   end: { line, column}
    // }
    //

    if (contextBefore == undefined) {
      contextBefore = 2;
    };

    var startBeforeIndex = Math.max(
      range.start.line - contextBefore, 0
    );

    var prefixLength = ((range.start.line + 1) + "").length;

    var beforeLines = source
      .filter(function (line, index) {
        return index >= startBeforeIndex && index < range.start.line
      })
      .map(function (line, index) {
        var number = startBeforeIndex + index + 1;  // 1 to account for 0-index
        return Debug.formatLineNumberPrefix(line, number, prefixLength)
      });

    var line = source[range.start.line];
    var number = range.start.line + 1; // zero-index

    var pointerStart = range.start.column;
    var pointerEnd;

    if (range.start.line == range.end.line) {
      // start and end are same line: pointer ends at column
      pointerEnd = range.end.column;
    } else {
      pointerEnd = line.length;
    }

    var allLines = beforeLines.concat([
      Debug.formatLineNumberPrefix(line, number, prefixLength),
      Debug.formatLinePointer(line, pointerStart, pointerEnd, prefixLength)
    ]);

    return allLines.join(OS.EOL);
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
