var OS = require("os");
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var debug = require("debug")("lib:debug");
var BN = require("bn.js");
var util = require("util");

var commandReference = {
  "o": "step over",
  "i": "step into",
  "u": "step out",
  "n": "step next",
  ";": "step instruction (include number to step multiple)",
  "p": "print instruction",
  "h": "print this help",
  "v": "print variables and values",
  ":": "evaluate expression - see `v`",
  "+": "add watch expression (`+:<expr>`)",
  "-": "remove watch expression (-:<expr>)",
  "?": "list existing watch expressions and breakpoints",
  "b": "add breakpoint",
  "B": "remove breakpoint",
  "c": "continue until breakpoint",
  "q": "quit",
  "r": "reset",
  "t": "load new transaction",
  "T": "unload transaction"
};

var DebugUtils = {
  gatherArtifacts: function(config) {
    return new Promise((accept, reject) => {
      // Gather all available contract artifacts
      dir.files(config.contracts_build_directory, (err, files) => {
        if (err) return reject(err);

        var contracts = files
          .filter(file_path => {
            return path.extname(file_path) === ".json";
          })
          .map(file_path => {
            return path.basename(file_path, ".json");
          })
          .map(contract_name => {
            return config.resolver.require(contract_name);
          });

        async.each(
          contracts,
          (abstraction, finished) => {
            abstraction
              .detectNetwork()
              .then(() => {
                finished();
              })
              .catch(finished);
          },
          err => {
            if (err) return reject(err);
            accept(
              contracts.map(contract => {
                debug("contract.sourcePath: %o", contract.sourcePath);

                return {
                  contractName: contract.contractName,
                  source: contract.source,
                  sourceMap: contract.sourceMap,
                  sourcePath: contract.sourcePath,
                  binary: contract.binary,
                  abi: contract.abi,
                  ast: contract.ast,
                  deployedBinary: contract.deployedBinary,
                  deployedSourceMap: contract.deployedSourceMap,
                  compiler: contract.compiler
                };
              })
            );
          }
        );
      });
    });
  },

  formatStartMessage: function(withTransaction) {
    if (withTransaction) {
      return "Gathering information about your project and the transaction...";
    } else {
      return "Gathering information about your project...";
    }
  },

  formatTransactionStartMessage: function() {
    return "Gathering information about the transaction...";
  },

  formatCommandDescription: function(commandId) {
    return "(" + commandId + ") " + commandReference[commandId];
  },

  formatPrompt: function(network, txHash) {
    return txHash !== undefined
      ? `debug(${network}:${txHash.substring(0, 10)}...)> `
      : `debug(${network})> `;
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
      lines.push(
        "Warning: The source code for one or more contracts could not be found."
      );
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
      [";", "p"],
      ["h", "q", "r"],
      ["t", "T"],
      ["b", "B", "c"],
      ["+", "-"],
      ["?"],
      ["v", ":"]
    ].map(function(shortcuts) {
      return shortcuts.map(DebugUtils.formatCommandDescription).join(", ");
    });

    var suffix = [""];

    var lines = prefix.concat(commandSections).concat(suffix);

    return lines.join(OS.EOL);
  },

  formatLineNumberPrefix: function(line, number, cols, tab) {
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
      var pointedAt = i >= startCol && i < endCol;
      var isTab = line[i] === "\t";

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
    // range is {
    //   start: { line, column },
    //   end: { line, column}
    // }
    //

    if (contextBefore == undefined) {
      contextBefore = 2;
    }

    var startBeforeIndex = Math.max(range.start.line - contextBefore, 0);

    var prefixLength = (range.start.line + 1 + "").length;

    var beforeLines = source
      .filter(function(line, index) {
        return index >= startBeforeIndex && index < range.start.line;
      })
      .map(function(line, index) {
        var number = startBeforeIndex + index + 1; // 1 to account for 0-index
        return DebugUtils.formatLineNumberPrefix(line, number, prefixLength);
      });

    var line = source[range.start.line];
    var number = range.start.line + 1; // zero-index

    var pointerStart = range.start.column;
    var pointerEnd;

    // range.end is undefined in some cases
    // null/undefined check to avoid exceptions
    if (range.end && range.start.line === range.end.line) {
      // start and end are same line: pointer ends at column
      pointerEnd = range.end.column;
    } else {
      pointerEnd = line.length;
    }

    var allLines = beforeLines.concat([
      DebugUtils.formatLineNumberPrefix(line, number, prefixLength),
      DebugUtils.formatLinePointer(line, pointerStart, pointerEnd, prefixLength)
    ]);

    return allLines.join(OS.EOL);
  },

  formatBreakpointLocation: function(
    breakpoint,
    here,
    currentSourceId,
    sourceNames
  ) {
    let baseMessage;
    if (breakpoint.node !== undefined) {
      baseMessage = here
        ? `this point in line ${breakpoint.line + 1}`
        : `a point in line ${breakpoint.line + 1}`;
      //note we always add 1 to adjust for zero-indexing
    } else {
      baseMessage = `line ${breakpoint.line + 1}`;
    }
    if (breakpoint.sourceId !== currentSourceId) {
      let sourceName = sourceNames[breakpoint.sourceId];
      return baseMessage + ` in ${sourceName}`;
    } else {
      return baseMessage;
    }
  },

  formatInstruction: function(traceIndex, traceLength, instruction) {
    return (
      "(" +
      traceIndex +
      "/" +
      traceLength +
      ") " +
      instruction.name +
      " " +
      (instruction.pushData || "")
    );
  },

  formatPC: function(pc) {
    let hex = pc.toString(16);
    if (hex.length % 2 !== 0) {
      hex = "0" + hex; //ensure even length
    }
    return "  PC = " + pc.toString() + " = 0x" + hex;
  },

  formatStack: function(stack) {
    var formatted = stack.map(function(item, index) {
      item = "  " + item;
      if (index === stack.length - 1) {
        item += " (top)";
      }

      return item;
    });

    if (stack.length === 0) {
      formatted.push("  No data on stack.");
    }

    return formatted.join(OS.EOL);
  },

  formatValue: function(value, indent) {
    if (!indent) {
      indent = 0;
    }

    return util
      .inspect(value, {
        colors: true,
        depth: null,
        breakLength: 30
      })
      .split(/\r?\n/g)
      .map(function(line, i) {
        // don't indent first line
        const padding = i > 0 ? Array(indent).join(" ") : "";
        return padding + line;
      })
      .join(OS.EOL);
  },

  //HACK
  cleanConstructors: function(object) {
    debug("object %o", object);

    if (object && typeof object.map === "function") {
      //array case
      return object.map(DebugUtils.cleanConstructors);
    }

    if (object && object instanceof Map) {
      //map case
      return new Map(
        Array.from(object.entries()).map(([key, value]) => [
          key,
          DebugUtils.cleanConstructors(value)
        ])
      );
    }

    //HACK -- due to safeEval altering things, it's possible for isBN() to
    //throw an error here
    try {
      //we do not want to alter BNs!
      //(or other special objects, but that's just BNs right now)
      if (BN.isBN(object)) {
        return object;
      }
    } catch (e) {
      //if isBN threw an error, it's not a BN, so move on
    }

    if (object && typeof object === "object") {
      //generic object case
      return Object.assign(
        {},
        ...Object.entries(object)
          .filter(
            ([key, value]) => key !== "constructor" || value !== undefined
          )
          .map(([key, value]) => ({
            [key]: DebugUtils.cleanConstructors(value)
          }))
      );
    }

    //for strings, numbers, etc
    return object;
  },

  //HACK
  cleanThis: function(variables, replacement) {
    return Object.assign(
      {},
      ...Object.entries(variables).map(
        ([variable, value]) =>
          variable === "this" ? { [replacement]: value } : { [variable]: value }
      )
    );
  },

  //HACK
  //replace maps with objects (POJSOs?) and BNs with numbers
  //May cause errors if BNs are too big!  But I think this is the right
  //tradeoff for now; note this is only used when dealing with *expressions*,
  //not individual variables (it's used so you can add and index and etc like
  //you would in Solidity)
  nativize: function(object) {
    if (object && typeof object.map === "function") {
      //array case
      return object.map(DebugUtils.nativize);
    }

    if (object && object instanceof Map) {
      //map case
      //HACK -- we apply toString() to all the keys; due to JS's use of weak
      //comparison for indexing, this should still work
      return Object.assign(
        {},
        ...Array.from(object.entries()).map(([key, value]) => ({
          [key.toString()]: DebugUtils.nativize(value)
        }))
      );
    }

    //HACK -- due to safeEval altering things, it's possible for isBN() to
    //throw an error here
    try {
      if (BN.isBN(object)) {
        return object.toNumber();
      }
    } catch (e) {
      //if isBN threw an error, it's not a BN, so move on
    }

    if (object && typeof object === "object") {
      //generic object case
      return Object.assign(
        {},
        ...Object.entries(object).map(([key, value]) => ({
          [key]: DebugUtils.nativize(value)
        }))
      );
    }

    //default case for strings, numbers, etc
    return object;
  }
};

module.exports = DebugUtils;
