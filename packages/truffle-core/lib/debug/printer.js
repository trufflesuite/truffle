const debugModule = require("debug");
const debug = debugModule("lib:debug:printer");

const path = require("path");
const safeEval = require("safe-eval");

const DebugUtils = require("truffle-debug-utils");

const selectors = require("truffle-debugger").selectors;
const { session, solidity, trace, controller } = selectors;

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
  }

  print(...args) {
    this.config.logger.log(...args);
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

  printState() {
    const source = this.session.view(solidity.current.source).source;
    const range = this.session.view(solidity.current.sourceRange);
    debug("source: %o", source);
    debug("range: %o", range);

    // We were splitting on OS.EOL, but it turns out on Windows,
    // in some environments (perhaps?) line breaks are still denoted by just \n
    const splitLines = str => str.split(/\r?\n/g);

    if (!source) {
      this.config.logger.log();
      this.config.logger.log("1: // No source code found.");
      this.config.logger.log("");
      return;
    }

    const lines = splitLines(source);

    this.config.logger.log("");

    this.config.logger.log(DebugUtils.formatRangeLines(lines, range.lines));

    this.config.logger.log("");
  }

  printInstruction() {
    const instruction = this.session.view(solidity.current.instruction);
    const step = this.session.view(trace.step);
    const traceIndex = this.session.view(trace.index);
    const totalSteps = this.session.view(trace.steps).length;

    this.config.logger.log("");
    this.config.logger.log(
      DebugUtils.formatInstruction(traceIndex + 1, totalSteps, instruction)
    );
    this.config.logger.log(DebugUtils.formatPC(step.pc));
    this.config.logger.log(DebugUtils.formatStack(step.stack));
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
    let sourceNames = Object.assign(
      {},
      ...Object.values(this.session.view(solidity.info.sources)).map(
        ({ id, sourcePath }) => ({
          [id]: path.basename(sourcePath)
        })
      )
    );
    let breakpoints = this.session.view(controller.breakpoints);
    if (breakpoints.length > 0) {
      for (let breakpoint of this.session.view(controller.breakpoints)) {
        let currentLocation = this.session.view(controller.current.location);
        let locationMessage = DebugUtils.formatBreakpointLocation(
          breakpoint,
          currentLocation.node !== undefined &&
            breakpoint.node === currentLocation.node.id,
          currentLocation.source.id,
          sourceNames
        );
        this.config.logger.log("  Breakpoint at " + locationMessage);
      }
    } else {
      this.config.logger.log("No breakpoints added.");
    }
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
    variables = DebugUtils.nativize(variables);

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
      const formatted = DebugUtils.formatValue(result, indent);
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
        this.config.logger.log(DebugUtils.formatValue(undefined));
      }
    }
  }
}

module.exports = {
  DebugPrinter
};
