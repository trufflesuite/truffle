var OS = require("os");
var dir = require("node-dir");
var path = require("path");
var debug = require("debug")("debug-utils");
var BN = require("bn.js");
var util = require("util");
var Codec = require("@truffle/codec");

var chromafi = require("@trufflesuite/chromafi");
var hljsDefineSolidity = require("highlightjs-solidity");
hljsDefineSolidity(chromafi.hljs);
var chalk = require("chalk");

const commandReference = {
  "o": "step over",
  "i": "step into",
  "u": "step out",
  "n": "step next",
  ";": "step instruction (include number to step multiple)",
  "p": "print instruction & state (can specify locations, e.g. p mem; see docs)",
  "l": "print additional source context",
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

const truffleColors = {
  mint: chalk.hex("#3FE0C5"),
  orange: chalk.hex("#E4A663"),
  pink: chalk.hex("#E911BD"),
  purple: chalk.hex("#8731E8"),
  green: chalk.hex("#00D717"),
  red: chalk.hex("#D60000"),
  yellow: chalk.hex("#F2E941"),
  blue: chalk.hex("#25A9E0"),
  comment: chalk.hsl(30, 20, 50),
  watermelon: chalk.hex("#E86591"),
  periwinkle: chalk.hex("#7F9DD1")
};

var DebugUtils = {
  gatherArtifacts: async function(config) {
    // Gather all available contract artifacts
    let files = await dir.promiseFiles(config.contracts_build_directory);

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

    await Promise.all(
      contracts.map(abstraction => abstraction.detectNetwork())
    );

    return contracts.map(contract => ({
      contractName: contract.contractName,
      source: contract.source,
      sourceMap: contract.sourceMap,
      sourcePath: contract.sourcePath,
      bytecode: contract.bytecode,
      abi: contract.abi,
      ast: contract.ast,
      deployedBytecode: contract.deployedBytecode,
      deployedSourceMap: contract.deployedSourceMap,
      compiler: contract.compiler
    }));
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
    return (
      truffleColors.mint(`(${commandId})`) + " " + commandReference[commandId]
    );
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
      truffleColors.mint("(enter)") +
        " last command entered (" +
        commandReference[lastCommand] +
        ")"
    ];

    var commandSections = [
      ["o", "i", "u", "n"],
      [";"],
      ["p"],
      ["l", "h"],
      ["q", "r", "t", "T"],
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

    return truffleColors.purple(prefix + output);
  },

  //NOTE: source and uncolorizedSource here have already
  //been split into lines here, they're not the raw text
  formatRangeLines: function(
    source,
    range,
    uncolorizedSource,
    contextBefore = 2,
    contextAfter = 0
  ) {
    // range is {
    //   start: { line, column },
    //   end: { line, column}
    // }
    //

    var startIndex = Math.max(range.start.line - contextBefore, 0);
    var endIndex = Math.min(range.start.line + contextAfter, source.length - 1);

    var prefixLength = (endIndex + 1 + "").length; //+1 to account for 0-index

    //note: beforeLines now includes the line itself
    var beforeLines = source
      .slice(startIndex, range.start.line + 1)
      .map((line, index) => {
        let number = startIndex + index + 1; // 1 to account for 0-index
        return DebugUtils.formatLineNumberPrefix(line, number, prefixLength);
      });
    var afterLines = source
      .slice(range.start.line + 1, endIndex + 1)
      .map((line, index) => {
        let number = range.start.line + 1 + index + 1; // 1 to account for 0-index
        return DebugUtils.formatLineNumberPrefix(line, number, prefixLength);
      });

    var pointerStart = range.start.column;
    var pointerEnd;

    let uncolorizedLine = uncolorizedSource[range.start.line];

    // range.end is undefined in some cases
    // null/undefined check to avoid exceptions
    if (range.end && range.start.line === range.end.line) {
      // start and end are same line: pointer ends at column
      pointerEnd = range.end.column;
    } else {
      pointerEnd = uncolorizedLine.length;
    }

    var allLines = beforeLines.concat(
      [
        DebugUtils.formatLinePointer(
          //the line-pointer formatter doesn't work right with colorized
          //lines, so we pass in the uncolored version
          uncolorizedLine,
          pointerStart,
          pointerEnd,
          prefixLength
        )
      ],
      afterLines
    );

    return allLines.join(OS.EOL);
  },

  formatBreakpointLocation: function(
    breakpoint,
    here,
    currentCompilationId,
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
    if (
      breakpoint.compilationId !== currentCompilationId ||
      breakpoint.sourceId !== currentSourceId
    ) {
      let sourceName =
        sourceNames[breakpoint.compilationId][breakpoint.sourceId];
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
      truffleColors.mint(instruction.name + " " + (instruction.pushData || ""))
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
    //stack here is an array of hex words (no "0x")
    var formatted = stack.map((item, index) => {
      item = truffleColors.orange(item);
      item = "  " + item;
      if (index === stack.length - 1) {
        item += " (top)";
      } else {
        item += ` (${stack.length - index - 1} from top)`;
      }

      return item;
    });

    if (stack.length === 0) {
      formatted.unshift("  No data on stack.");
    } else {
      formatted.unshift("Stack:");
    }

    return formatted.join(OS.EOL);
  },

  formatMemory: function(memory) {
    //note memory here is an array of hex words (no "0x"),
    //not a single long hex string

    //get longest prefix needed;
    //minimum of 2 so always show at least 2 hex digits
    let maxPrefixLength = Math.max(
      2,
      ((memory.length - 1) * Codec.Evm.Utils.WORD_SIZE).toString(16).length
    );
    if (maxPrefixLength % 2 !== 0) {
      maxPrefixLength++; //make sure to use even # of hex digits
    }

    let formatted = memory.map((word, index) => {
      let address = (index * Codec.Evm.Utils.WORD_SIZE)
        .toString(16)
        .padStart(maxPrefixLength, "0");
      return `  0x${address}:  ${truffleColors.pink(word)}`;
    });

    if (memory.length === 0) {
      formatted.unshift("  No data in memory.");
    } else {
      formatted.unshift("Memory:");
    }

    return formatted.join(OS.EOL);
  },

  formatStorage: function(storage) {
    //storage here is an object mapping hex words to hex words (no 0x)

    //first: sort the keys (slice to clone as sort is in-place)
    //note: we can use the default sort here; it will do the righ thing
    let slots = Object.keys(storage)
      .slice()
      .sort();

    let formatted = slots.map((slot, index) => {
      if (
        index === 0 ||
        !Codec.Conversion.toBN(slot).eq(
          Codec.Conversion.toBN(slots[index - 1]).addn(1)
        )
      ) {
        return `0x${slot}:\n` + `  ${truffleColors.blue(storage[slot])}`;
      } else {
        return `  ${truffleColors.blue(storage[slot])}`;
      }
    });

    if (slots.length === 0) {
      formatted.unshift("  No known relevant data found in storage.");
    } else {
      formatted.unshift("Storage (partial view):");
    }

    return formatted.join(OS.EOL);
  },

  formatCalldata: function(calldata) {
    //takes a Uint8Array
    let selector = calldata.slice(0, Codec.Evm.Utils.SELECTOR_SIZE);
    let words = [];
    for (
      let wordIndex = Codec.Evm.Utils.SELECTOR_SIZE;
      wordIndex < calldata.length;
      wordIndex += Codec.Evm.Utils.WORD_SIZE
    ) {
      words.push(
        calldata.slice(wordIndex, wordIndex + Codec.Evm.Utils.WORD_SIZE)
      );
    }
    let maxWordIndex =
      (words.length - 1) * Codec.Evm.Utils.WORD_SIZE +
      Codec.Evm.Utils.SELECTOR_SIZE;
    let maxPrefixLength = Math.max(2, maxWordIndex.toString(16).length);
    if (maxPrefixLength % 2 !== 0) {
      maxPrefixLength++;
    }
    let formattedSelector;
    if (selector.length > 0) {
      formattedSelector =
        "Calldata:\n" +
        `  0x${"00".padStart(maxPrefixLength, "0")}:  ` +
        truffleColors.pink(
          Codec.Conversion.toHexString(selector)
            .slice(2)
            .padStart(2 * Codec.Evm.Utils.WORD_SIZE, "  ")
        );
    } else {
      formattedSelector = "  No data in calldata.";
    }

    let formatted = words.map((word, index) => {
      let address = (
        index * Codec.Evm.Utils.WORD_SIZE +
        Codec.Evm.Utils.SELECTOR_SIZE
      )
        .toString(16)
        .padStart(maxPrefixLength, "0");
      let data = Codec.Conversion.toHexString(word)
        .slice(2)
        .padEnd(2 * Codec.Evm.Utils.WORD_SIZE);
      return `  0x${address}:  ${truffleColors.pink(data)}`;
    });

    formatted.unshift(formattedSelector);

    return formatted.join(OS.EOL);
  },

  formatValue: function(value, indent = 0, nativized = false) {
    let inspectOptions = {
      colors: true,
      depth: null,
      maxArrayLength: null,
      breakLength: 30
    };
    let valueToInspect = nativized
      ? value
      : new Codec.Format.Utils.Inspect.ResultInspector(value);
    return util
      .inspect(valueToInspect, inspectOptions)
      .split(/\r?\n/g)
      .map((line, i) => {
        // don't indent first line
        const padding = i > 0 ? Array(indent).join(" ") : "";
        return padding + line;
      })
      .join(OS.EOL);
  },

  colorize: function(code) {
    //I'd put these outside the function
    //but then it gives me errors, because
    //you can't just define self-referential objects like that...

    const trufflePalette = {
      /* base (chromafi special, not hljs) */
      "base": chalk,
      "lineNumbers": chalk,
      "trailingSpace": chalk,
      /* classes hljs-solidity actually uses */
      "keyword": truffleColors.mint,
      "number": truffleColors.red,
      "string": truffleColors.green,
      "params": truffleColors.pink,
      "builtIn": truffleColors.watermelon,
      "built_in": truffleColors.watermelon, //just to be sure
      "literal": truffleColors.watermelon,
      "function": truffleColors.orange,
      "title": truffleColors.orange,
      "class": truffleColors.orange,
      "comment": truffleColors.comment,
      "doctag": truffleColors.comment,
      /* classes it might soon use! */
      "meta": truffleColors.pink,
      "metaString": truffleColors.green,
      "meta-string": truffleColors.green, //similar
      /* classes it doesn't currently use but notionally could */
      "type": truffleColors.orange,
      "symbol": truffleColors.orange,
      "metaKeyword": truffleColors.mint,
      "meta-keyword": truffleColors.mint, //again, to be sure
      /* classes that don't make sense for Solidity */
      "regexp": chalk, //solidity does not have regexps
      "subst": chalk, //or string interpolation
      "name": chalk, //or s-expressions
      "builtInName": chalk, //or s-expressions, again
      "builtin-name": chalk, //just to be sure
      /* classes for config, markup, CSS, templates, diffs (not programming) */
      "section": chalk,
      "tag": chalk,
      "attr": chalk,
      "attribute": chalk,
      "variable": chalk,
      "bullet": chalk,
      "code": chalk,
      "emphasis": chalk,
      "strong": chalk,
      "formula": chalk,
      "link": chalk,
      "quote": chalk,
      "selectorAttr": chalk, //lotta redundancy follows
      "selector-attr": chalk,
      "selectorClass": chalk,
      "selector-class": chalk,
      "selectorId": chalk,
      "selector-id": chalk,
      "selectorPseudo": chalk,
      "selector-pseudo": chalk,
      "selectorTag": chalk,
      "selector-tag": chalk,
      "templateTag": chalk,
      "template-tag": chalk,
      "templateVariable": chalk,
      "template-variable": chalk,
      "addition": chalk,
      "deletion": chalk
    };

    const options = {
      lang: "solidity",
      colors: trufflePalette,
      //we want to turn off basically everything else, as we're
      //handling padding & numbering manually
      lineNumbers: false,
      stripIndent: false,
      codePad: 0
      //NOTE: you might think you should pass highlight: true,
      //but you'd be wrong!  I don't understand this either
    };
    return chromafi(code, options);
  },

  //HACK
  //note that this is written in terms of mutating things
  //rather than just using map() due to the need to handle
  //circular objects
  cleanConstructors: function(object, seenSoFar = new Map()) {
    debug("object %o", object);
    if (seenSoFar.has(object)) {
      return seenSoFar.get(object);
    }

    if (Array.isArray(object)) {
      //array case
      let output = object.slice(); //clone
      //set up new seenSoFar
      let seenNow = new Map(seenSoFar);
      seenNow.set(object, output);
      for (let index in output) {
        output[index] = DebugUtils.cleanConstructors(output[index], seenNow);
      }
      return output;
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
      let output = Object.assign(
        {},
        ...Object.entries(object)
          .filter(
            ([key, value]) => key !== "constructor" || value !== undefined
          )
          .map(([key, value]) => ({
            [key]: value //don't clean yet!
          }))
      );
      //set up new seenSoFar
      let seenNow = new Map(seenSoFar);
      seenNow.set(object, output);
      for (let field in output) {
        output[field] = DebugUtils.cleanConstructors(output[field], seenNow);
      }
      return output;
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
  }
};

module.exports = DebugUtils;
