const debugModule = require("debug");
const debug = debugModule("lib:debug:printer");

const path = require("path");
const safeEval = require("safe-eval");

const DebugUtils = require("@truffle/debug-utils");
const Codec = require("@truffle/codec");

const selectors = require("@truffle/debugger").selectors;
const { session, solidity, trace, controller, data, evm } = selectors;

class DebugPrinter {
  constructor(config, session) {
    this.config = config;
    this.session = session;
    this.select = expr => {
      let selector, result;

      try {
        selector = expr
          .split(".")
          .filter(next => next.length > 0)
          .reduce((sel, next) => sel[next], selectors);
      } catch (_) {
        throw new Error("Unknown selector: %s", expr);
      }

      // throws its own exception
      result = this.session.view(selector);

      return result;
    };

    this.colorizedSources = {};
    for (const [compilationId, compilation] of Object.entries(
      this.session.view(solidity.info.sources)
    )) {
      this.colorizedSources[compilationId] = {};
      for (const source of compilation.byId) {
        const id = source.id;
        const uncolorized = source.source;
        const colorized = DebugUtils.colorize(uncolorized);
        this.colorizedSources[compilationId][id] = colorized;
      }
    }

    this.printouts = new Set(["sta"]);
    this.locations = ["sto", "cal", "mem", "sta"]; //should remain constant
  }

  print(...args) {
    this.config.logger.log(...args);
  }

  printSessionLoaded() {
    this.printAddressesAffected();
    this.printHelp();
    debug("Help printed");
    this.printFile();
    debug("File printed");
    this.printState();
    debug("State printed");
  }

  printSessionError() {
    this.print(this.session.view(session.status.error));
    this.printHelp();
  }

  printAddressesAffected() {
    const affectedInstances = this.session.view(session.info.affectedInstances);

    this.config.logger.log("");
    this.config.logger.log("Addresses called: (not created)");
    this.config.logger.log(
      DebugUtils.formatAffectedInstances(affectedInstances)
    );
  }

  printHelp() {
    this.config.logger.log("");
    this.config.logger.log(DebugUtils.formatHelp());
  }

  printFile() {
    let message = "";

    debug("about to determine sourcePath");
    const sourcePath = this.session.view(solidity.current.source).sourcePath;

    if (sourcePath) {
      message += path.basename(sourcePath);
    } else {
      message += "?";
    }

    this.config.logger.log("");
    this.config.logger.log(message + ":");
  }

  printState(contextBefore = 2, contextAfter = 0) {
    const { id: sourceId, source, compilationId } = this.session.view(
      solidity.current.source
    );

    if (sourceId === undefined) {
      this.config.logger.log();
      this.config.logger.log("1: // No source code found.");
      this.config.logger.log("");
      return;
    }

    const colorizedSource = this.colorizedSources[compilationId][sourceId];

    const range = this.session.view(solidity.current.sourceRange);
    debug("range: %o", range);

    // We were splitting on OS.EOL, but it turns out on Windows,
    // in some environments (perhaps?) line breaks are still denoted by just \n
    const splitLines = str => str.split(/\r?\n/g);

    const lines = splitLines(source);
    const colorizedLines = splitLines(colorizedSource);

    this.config.logger.log("");

    //HACK -- the line-pointer formatter doesn't work right with colorized
    //lines, so we pass in the uncolored version too
    this.config.logger.log(
      DebugUtils.formatRangeLines(
        colorizedLines,
        range.lines,
        lines,
        contextBefore,
        contextAfter
      )
    );

    this.config.logger.log("");
  }

  printInstruction(locations = this.printouts) {
    const instruction = this.session.view(solidity.current.instruction);
    const step = this.session.view(trace.step);
    const traceIndex = this.session.view(trace.index);
    const totalSteps = this.session.view(trace.steps).length;
    //note calldata will be a Uint8Array, not a hex string or array of such
    const calldata = this.session.view(data.current.state.calldata);
    //storage here is an object mapping hex words to hex words, all w/o 0x prefix
    const storage = this.session.view(evm.current.codex.storage);

    this.config.logger.log("");
    if (locations.has("sto")) {
      this.config.logger.log(DebugUtils.formatStorage(storage));
      this.config.logger.log("");
    }
    if (locations.has("cal")) {
      this.config.logger.log(DebugUtils.formatCalldata(calldata));
      this.config.logger.log("");
    }
    if (locations.has("mem")) {
      this.config.logger.log(DebugUtils.formatMemory(step.memory));
      this.config.logger.log("");
    }
    if (locations.has("sta")) {
      this.config.logger.log(DebugUtils.formatStack(step.stack));
      this.config.logger.log("");
    }
    this.config.logger.log(
      DebugUtils.formatInstruction(traceIndex + 1, totalSteps, instruction)
    );
    this.config.logger.log(DebugUtils.formatPC(step.pc));
    this.config.logger.log("");
    this.config.logger.log(step.gas + " gas remaining");
  }

  /**
   * @param {string} selector
   */
  printSelector(selector) {
    const result = this.select(selector);
    const debugSelector = debugModule(selector);
    debugSelector.enabled = true;
    debugSelector("%O", result);
  }

  printWatchExpressions(expressions) {
    if (expressions.size === 0) {
      this.config.logger.log("No watch expressions added.");
      return;
    }

    this.config.logger.log("");
    expressions.forEach(function(expression) {
      this.config.logger.log("  " + expression);
    });
  }

  printBreakpoints() {
    let sources = this.session.view(solidity.info.sources);
    let sourceNames = Object.assign(
      {},
      ...Object.entries(sources).map(([compilationId, compilation]) => ({
        [compilationId]: Object.assign(
          {},
          ...Object.values(compilation.byId).map(({ id, sourcePath }) => ({
            [id]: path.basename(sourcePath)
          }))
        )
      }))
    );
    let breakpoints = this.session.view(controller.breakpoints);
    if (breakpoints.length > 0) {
      for (let breakpoint of this.session.view(controller.breakpoints)) {
        let currentLocation = this.session.view(controller.current.location);
        let locationMessage = DebugUtils.formatBreakpointLocation(
          breakpoint,
          currentLocation.node !== undefined &&
            breakpoint.node === currentLocation.node.id,
          currentLocation.source.compilationId,
          currentLocation.source.id,
          sourceNames
        );
        this.config.logger.log("  Breakpoint at " + locationMessage);
      }
    } else {
      this.config.logger.log("No breakpoints added.");
    }
  }

  printRevertMessage() {
    this.config.logger.log("Transaction halted with a RUNTIME ERROR.");
    this.config.logger.log("");
    let rawRevertMessage = this.session.view(evm.current.step.returnValue);
    let revertDecodings = Codec.decodeRevert(
      Codec.Conversion.toBytes(rawRevertMessage)
    );
    switch (revertDecodings.length) {
      case 0:
        this.config.logger.log(
          "There was a revert message, but it could not be decoded."
        );
        break;
      case 1:
        let revertDecoding = revertDecodings[0];
        switch (revertDecoding.kind) {
          case "failure":
            this.config.logger.log(
              "There was no revert message.  This may be due to an in intentional halting expression, such as assert(), revert(), or require(), or could be due to an unintentional exception such as out-of-gas exceptions."
            );
            break;
          case "revert":
            let revertStringInfo = revertDecoding.arguments[0].value.value;
            let revertString;
            switch (revertStringInfo.kind) {
              case "valid":
                revertString = revertStringInfo.asString;
                this.config.logger.log(`Revert message: ${revertString}`);
                break;
              case "malformed":
                //turn into a JS string while smoothing over invalid UTF-8
                //slice 2 to remove 0x prefix
                revertString = Buffer.from(
                  revertStringInfo.asHex.slice(2),
                  "hex"
                ).toString();
                this.config.logger.log(`Revert message: ${revertString}`);
                this.config.logger.log(
                  "Warning: This message contained invalid UTF-8."
                );
                break;
            }
            break;
        }
        break;
      default:
        //Note: This shouldn't happen
        this.config.logger.log(
          "There was a revert message, but it could not be unambiguously decoded."
        );
        break;
    }
    this.config.logger.log(
      "Please inspect your transaction parameters and contract code to determine the meaning of this error."
    );
  }

  async printWatchExpressionsResults(expressions) {
    debug("expressions %o", expressions);
    for (let expression of expressions) {
      this.config.logger.log(expression);
      // Add some padding. Note: This won't work with all loggers,
      // meaning it's not portable. But doing this now so we can get something
      // pretty until we can build more architecture around this.
      // Note: Selector results already have padding, so this isn't needed.
      if (expression[0] === ":") {
        process.stdout.write("  ");
      }
      await this.printWatchExpressionResult(expression);
    }
  }

  async printWatchExpressionResult(expression) {
    const type = expression[0];
    const exprArgs = expression.substring(1);

    if (type === "!") {
      this.printSelector(exprArgs);
    } else {
      await this.evalAndPrintExpression(exprArgs, 2, true);
    }
  }

  async printVariables() {
    let variables = await this.session.variables();

    debug("variables %o", variables);

    // Get the length of the longest name.
    const longestNameLength = Math.max.apply(
      null,
      Object.keys(variables).map(function(name) {
        return name.length;
      })
    );

    this.config.logger.log();

    Object.keys(variables).forEach(name => {
      let paddedName = name + ":";

      while (paddedName.length <= longestNameLength) {
        paddedName = " " + paddedName;
      }

      const value = variables[name];
      const formatted = DebugUtils.formatValue(value, longestNameLength + 5);

      this.config.logger.log("  " + paddedName, formatted);
    });

    this.config.logger.log();
  }

  /**
   * @param {string} raw - user input for watch expression
   *
   * performs pre-processing on `raw`, using !<...> delimeters to refer
   * to selector expressions.
   *
   * e.g., to see a particular part of the current trace step's stack:
   *
   *    debug(development:0x4228cdd1...)>
   *
   *        :!<trace.step.stack>[1]
   */
  async evalAndPrintExpression(raw, indent, suppress) {
    let variables = await this.session.variables();

    // converts all !<...> expressions to JS-valid selector requests
    const preprocessSelectors = expr => {
      const regex = /!<([^>]+)>/g;
      const select = "$"; // expect repl context to have this func
      const replacer = (_, selector) => `${select}("${selector}")`;

      return expr.replace(regex, replacer);
    };

    //if we're just dealing with a single variable, handle that case
    //separately (so that we can do things in a better way for that
    //case)
    let variable = raw.trim();
    if (variable in variables) {
      let formatted = DebugUtils.formatValue(variables[variable], indent);
      this.config.logger.log(formatted);
      this.config.logger.log();
      return;
    }

    //HACK
    //if we're not in the single-variable case, we'll need to do some
    //things to Javascriptify our variables so that the JS syntax for
    //using them is closer to the Solidity syntax
    variables = Codec.Format.Utils.Inspect.nativizeVariables(variables);

    let context = Object.assign(
      { $: this.select },

      variables
    );

    //HACK -- we can't use "this" as a variable name, so we're going to
    //find an available replacement name, and then modify the context
    //and expression appropriately
    let pseudoThis = "_this";
    while (pseudoThis in context) {
      pseudoThis = "_" + pseudoThis;
    }
    //in addition to pseudoThis, which replaces this, we also have
    //pseudoPseudoThis, which replaces pseudoThis in order to ensure
    //that any uses of pseudoThis yield an error instead of showing this
    let pseudoPseudoThis = "thereisnovariableofthatname";
    while (pseudoPseudoThis in context) {
      pseudoPseudoThis = "_" + pseudoPseudoThis;
    }
    context = DebugUtils.cleanThis(context, pseudoThis);
    let expr = raw.replace(
      //those characters in [] are the legal JS variable name characters
      //note that pseudoThis contains no special characters
      new RegExp("(?<![a-zA-Z0-9_$])" + pseudoThis + "(?![a-zA-Z0-9_$])"),
      pseudoPseudoThis
    );
    expr = expr.replace(
      //those characters in [] are the legal JS variable name characters
      /(?<![a-zA-Z0-9_$])this(?![a-zA-Z0-9_$])/,
      pseudoThis
    );
    //note that pseudoThis contains no dollar signs to screw things up

    expr = preprocessSelectors(expr);

    try {
      let result = safeEval(expr, context);
      result = DebugUtils.cleanConstructors(result); //HACK
      const formatted = DebugUtils.formatValue(result, indent, true);
      this.config.logger.log(formatted);
      this.config.logger.log();
    } catch (e) {
      // HACK: safeEval edits the expression to capture the result, which
      // produces really weird output when there are errors. e.g.,
      //
      //   evalmachine.<anonymous>:1
      //   SAFE_EVAL_857712=a
      //   ^
      //
      //   ReferenceError: a is not defined
      //     at evalmachine.<anonymous>:1:1
      //     at ContextifyScript.Script.runInContext (vm.js:59:29)
      //
      // We want to hide this from the user if there's an error.
      e.stack = e.stack.replace(/SAFE_EVAL_\d+=/, "");
      if (!suppress) {
        this.config.logger.log(e);
      } else {
        this.config.logger.log(DebugUtils.formatValue(undefined, indent, true));
      }
    }
  }
}

module.exports = {
  DebugPrinter
};
