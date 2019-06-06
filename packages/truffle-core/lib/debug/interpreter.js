const debugModule = require("debug");
const debug = debugModule("lib:debug:interpreter");

const path = require("path");
const util = require("util");
const ora = require("ora");

const DebugUtils = require("truffle-debug-utils");
const selectors = require("truffle-debugger").selectors;
const { solidity, trace, evm, controller } = selectors;

const analytics = require("../services/analytics");
const ReplManager = require("../repl");

const { DebugPrinter } = require("./printer");

function watchExpressionAnalytics(raw) {
  if (raw.includes("!<")) {
    //don't send analytics for watch expressions involving selectors
    return;
  }
  let expression = raw.trim();
  //legal Solidity identifiers (= legal JS identifiers)
  let identifierRegex = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
  let isVariable = expression.match(identifierRegex) !== null;
  analytics.send({
    command: "debug: watch expression",
    args: { isVariable }
  });
}

class DebugInterpreter {
  constructor(config, session, txHash) {
    this.session = session;
    this.network = config.network;
    this.printer = new DebugPrinter(config, session);
    this.txHash = txHash;
    this.lastCommand = "n";

    this.repl = config.repl || new ReplManager(config);
    this.enabledExpressions = new Set();
  }

  async setOrClearBreakpoint(args, setOrClear) {
    //setOrClear: true for set, false for clear
    const currentLocation = this.session.view(controller.current.location);
    const breakpoints = this.session.view(controller.breakpoints);

    const currentNode = currentLocation.node ? currentLocation.node.id : null;
    const currentLine = currentLocation.sourceRange
      ? currentLocation.sourceRange.lines.start.line
      : null;
    const currentSourceId = currentLocation.source
      ? currentLocation.source.id
      : null;

    let breakpoint = {};

    if (args.length === 0) {
      //no arguments, want currrent node
      debug("node case");
      if (currentNode === null) {
        this.printer.print("Cannot determine current location.");
        return;
      }
      breakpoint.node = currentNode;
      breakpoint.line = currentLine;
      breakpoint.sourceId = currentSourceId;
    }

    //the special case of "B all"
    else if (args[0] === "all") {
      if (setOrClear) {
        // only "B all" is legal, not "b all"
        this.printer.print("Cannot add breakpoint everywhere.\n");
        return;
      }
      await this.session.removeAllBreakpoints();
      this.printer.print("Removed all breakpoints.\n");
      return;
    }

    //if the argument starts with a "+" or "-", we have a relative
    //line number
    else if (args[0][0] === "+" || args[0][0] === "-") {
      debug("relative case");
      if (currentLine === null) {
        this.printer.print("Cannot determine current location.");
        return;
      }
      let delta = parseInt(args[0], 10); //want an integer
      debug("delta %d", delta);

      if (isNaN(delta)) {
        this.printer.print("Offset must be an integer.\n");
        return;
      }

      breakpoint.sourceId = currentSourceId;
      breakpoint.line = currentLine + delta;
    }

    //if it contains a colon, it's in the form source:line
    else if (args[0].includes(":")) {
      debug("source case");
      let sourceArgs = args[0].split(":");
      let sourceArg = sourceArgs[0];
      let lineArg = sourceArgs[1];
      debug("sourceArgs %O", sourceArgs);

      //first let's get the line number as usual
      let line = parseInt(lineArg, 10); //want an integer
      if (isNaN(line)) {
        this.printer.print("Line number must be an integer.\n");
        return;
      }

      //search sources for given string
      let sources = this.session.view(solidity.info.sources);

      //we will indeed need the sources here, not just IDs
      let matchingSources = Object.values(sources).filter(source =>
        source.sourcePath.includes(sourceArg)
      );

      if (matchingSources.length === 0) {
        this.printer.print(`No source file found matching ${sourceArg}.\n`);
        return;
      } else if (matchingSources.length > 1) {
        this.printer.print(
          `Multiple source files found matching ${sourceArg}.  Which did you mean?`
        );
        matchingSources.forEach(source =>
          this.printer.print(source.sourcePath)
        );
        this.printer.print("");
        return;
      }

      //otherwise, we found it!
      breakpoint.sourceId = matchingSources[0].id;
      breakpoint.line = line - 1; //adjust for zero-indexing!
    }

    //otherwise, it's a simple line number
    else {
      debug("absolute case");
      if (currentSourceId === null) {
        this.printer.print("Cannot determine current file.");
        return;
      }
      let line = parseInt(args[0], 10); //want an integer
      debug("line %d", line);

      if (isNaN(line)) {
        this.printer.print("Line number must be an integer.\n");
        return;
      }

      breakpoint.sourceId = currentSourceId;
      breakpoint.line = line - 1; //adjust for zero-indexing!
    }

    //OK, we've constructed the breakpoint!  But if we're adding, we'll
    //want to adjust to make sure we don't set it on an empty line or
    //anything like that
    if (setOrClear) {
      let resolver = this.session.view(controller.breakpoints.resolver);
      breakpoint = resolver(breakpoint);
      //of course, this might result in finding that there's nowhere to
      //add it after that point
      if (breakpoint === null) {
        this.printer.print(
          "Nowhere to add breakpoint at or beyond that location.\n"
        );
        return;
      }
    }

    //having constructed and adjusted breakpoint, here's now a
    //user-readable message describing its location
    let sourceNames = Object.assign(
      {},
      ...Object.values(this.session.view(solidity.info.sources)).map(
        ({ id, sourcePath }) => ({
          [id]: path.basename(sourcePath)
        })
      )
    );
    let locationMessage = DebugUtils.formatBreakpointLocation(
      breakpoint,
      true,
      currentSourceId,
      sourceNames
    );

    //one last check -- does this breakpoint already exist?
    let alreadyExists =
      breakpoints.filter(
        existingBreakpoint =>
          existingBreakpoint.sourceId === breakpoint.sourceId &&
          existingBreakpoint.line === breakpoint.line &&
          existingBreakpoint.node === breakpoint.node //may be undefined
      ).length > 0;

    //NOTE: in the "set breakpoint" case, the above check is somewhat
    //redundant, as we're going to check again when we actually make the
    //call to add or remove the breakpoint!  But we need to check here so
    //that we can display the appropriate message.  Hopefully we can find
    //some way to avoid this redundant check in the future.

    //if it already exists and is being set, or doesn't and is being
    //cleared, report back that we can't do that
    if (setOrClear === alreadyExists) {
      if (setOrClear) {
        this.printer.print(
          `Breakpoint at ${locationMessage} already exists.\n`
        );
        return;
      } else {
        this.printer.print(`No breakpoint at ${locationMessage} to remove.\n`);
        return;
      }
    }

    //finally, if we've reached this point, do it!
    //also report back to the user on what happened
    if (setOrClear) {
      await this.session.addBreakpoint(breakpoint);
      this.printer.print(`Breakpoint added at ${locationMessage}.\n`);
    } else {
      await this.session.removeBreakpoint(breakpoint);
      this.printer.print(`Breakpoint removed at ${locationMessage}.\n`);
    }
    return;
  }

  start(terminate) {
    let prompt;

    if (this.session.view(selectors.session.status.loaded)) {
      this.printer.printAddressesAffected();
      this.printer.printHelp();
      debug("Help printed");
      this.printer.printFile();
      debug("File printed");
      this.printer.printState();
      debug("State printed");
      prompt = DebugUtils.formatPrompt(this.network, this.txHash);
    } else {
      if (this.session.view(selectors.session.status.isError)) {
        this.printer.print(this.session.view(selectors.session.status.error));
      }
      this.printer.printHelp();
      prompt = DebugUtils.formatPrompt(this.network);
    }

    this.repl.start({
      prompt,
      interpreter: util.callbackify(this.interpreter.bind(this)),
      ignoreUndefined: true,
      done: terminate
    });
  }

  setPrompt(prompt) {
    this.repl.activate.bind(this.repl)({
      prompt,
      context: {},
      //this argument only *adds* things, so it's safe to set it to {}
      ignoreUndefined: true
      //set to true because it's set to true below :P
    });
  }

  async interpreter(cmd) {
    cmd = cmd.trim();
    let cmdArgs, splitArgs;
    debug("cmd %s", cmd);

    if (cmd === ".exit") {
      cmd = "q";
    }

    //split arguments for commands that want that; split on runs of spaces
    splitArgs = cmd
      .trim()
      .split(/ +/)
      .slice(1);
    debug("splitArgs %O", splitArgs);

    //warning: this bit *alters* cmd!
    if (cmd.length > 0) {
      cmdArgs = cmd.slice(1).trim();
      cmd = cmd[0];
    }

    if (cmd === "") {
      cmd = this.lastCommand;
      cmdArgs = "";
      splitArgs = [];
    }

    //quit if that's what we were given
    if (cmd === "q") {
      return await util.promisify(this.repl.stop.bind(this.repl))();
    }

    let alreadyFinished = this.session.view(trace.finishedOrUnloaded);
    let loadFailed = false;

    // If not finished, perform commands that require state changes
    // (other than quitting or resetting)
    if (!alreadyFinished) {
      let stepSpinner = ora("Stepping...").start();
      switch (cmd) {
        case "o":
          await this.session.stepOver();
          break;
        case "i":
          await this.session.stepInto();
          break;
        case "u":
          await this.session.stepOut();
          break;
        case "n":
          await this.session.stepNext();
          break;
        case ";":
          //two cases -- parameterized and unparameterized
          if (cmdArgs !== "") {
            let count = parseInt(cmdArgs, 10);
            debug("cmdArgs=%s", cmdArgs);
            if (isNaN(count)) {
              this.printer.print("Number of steps must be an integer.");
              break;
            }
            await this.session.advance(count);
          } else {
            await this.session.advance();
          }
          break;
        case "c":
          await this.session.continueUntilBreakpoint();
          break;
      }
      stepSpinner.stop();
    } //otherwise, inform the user we can't do that
    else {
      switch (cmd) {
        case "o":
        case "i":
        case "u":
        case "n":
        case "c":
          //are we "finished" because we've reached the end, or because
          //nothing is loaded?
          if (this.session.view(selectors.session.status.loaded)) {
            this.printer.print("Transaction has halted; cannot advance.");
            this.printer.print("");
          } else {
            this.printer.print("No transaction loaded.");
            this.printer.print("");
          }
      }
    }
    if (cmd === "r") {
      //reset if given the reset command
      //(but not if nothing is loaded)
      if (this.session.view(selectors.session.status.loaded)) {
        await this.session.reset();
      } else {
        this.printer.print("No transaction loaded.");
        this.printer.print("");
      }
    }
    if (cmd === "t") {
      if (!this.session.view(selectors.session.status.loaded)) {
        let txSpinner = ora(DebugUtils.formatTransactionStartMessage()).start();
        await this.session.load(cmdArgs);
        //if load succeeded
        if (this.session.view(selectors.session.status.success)) {
          txSpinner.succeed();
          //if successful, change prompt
          this.setPrompt(DebugUtils.formatPrompt(this.network, cmdArgs));
        } else {
          txSpinner.fail();
          loadFailed = true;
        }
      } else {
        loadFailed = true;
        this.printer.print(
          "Please unload the current transaction before loading a new one."
        );
      }
    }
    if (cmd === "T") {
      if (this.session.view(selectors.session.status.loaded)) {
        await this.session.unload();
        this.printer.print("Transaction unloaded.");
        this.setPrompt(DebugUtils.formatPrompt(this.network));
      } else {
        this.printer.print("No transaction to unload.");
        this.printer.print("");
      }
    }

    // Check if execution has (just now) stopped.
    if (this.session.view(trace.finished) && !alreadyFinished) {
      this.printer.print("");
      //check if transaction failed
      if (!this.session.view(evm.transaction.status)) {
        this.printer.print("Transaction halted with a RUNTIME ERROR.");
        this.printer.print("");
        this.printer.print(
          "This is likely due to an intentional halting expression, like assert(), require() or revert(). It can also be due to out-of-gas exceptions. Please inspect your transaction parameters and contract code to determine the meaning of this error."
        );
      } else {
        //case if transaction succeeded
        this.printer.print("Transaction completed successfully.");
      }
    }

    // Perform post printing
    // (we want to see if execution stopped before printing state).
    switch (cmd) {
      case "+":
        if (cmdArgs[0] === ":") {
          watchExpressionAnalytics(cmdArgs.substring(1));
        }
        this.enabledExpressions.add(cmdArgs);
        await this.printer.printWatchExpressionResult(cmdArgs);
        break;
      case "-":
        this.enabledExpressions.delete(cmdArgs);
        break;
      case "!":
        this.printer.printSelector(cmdArgs);
        break;
      case "?":
        this.printer.printWatchExpressions(this.enabledExpressions);
        this.printer.printBreakpoints();
        break;
      case "v":
        await this.printer.printVariables();
        break;
      case ":":
        watchExpressionAnalytics(cmdArgs);
        this.printer.evalAndPrintExpression(cmdArgs);
        break;
      case "b":
        await this.setOrClearBreakpoint(splitArgs, true);
        break;
      case "B":
        await this.setOrClearBreakpoint(splitArgs, false);
        break;
      case ";":
      case "p":
        if (this.session.view(selectors.session.status.loaded)) {
          this.printer.printFile();
          this.printer.printInstruction();
          this.printer.printState();
        }
        await this.printer.printWatchExpressionsResults(
          this.enabledExpressions
        );
        break;
      case "o":
      case "i":
      case "u":
      case "n":
      case "c":
        if (!this.session.view(trace.finishedOrUnloaded)) {
          if (!this.session.view(solidity.current.source).source) {
            this.printer.printInstruction();
          }
          this.printer.printFile();
          this.printer.printState();
        }
        await this.printer.printWatchExpressionsResults(
          this.enabledExpressions
        );
        break;
      case "r":
        if (this.session.view(selectors.session.status.loaded)) {
          this.printer.printAddressesAffected();
          this.printer.printFile();
          this.printer.printState();
        }
        break;
      case "t":
        if (!loadFailed) {
          this.printer.printAddressesAffected();
          this.printer.printFile();
          this.printer.printState();
        } else if (this.session.view(selectors.session.status.isError)) {
          let loadError = this.session.view(selectors.session.status.error);
          this.printer.print(loadError);
        }
        break;
      case "T":
        //nothing to print
        break;
      default:
        this.printer.printHelp();
    }

    if (
      cmd !== "i" &&
      cmd !== "u" &&
      cmd !== "b" &&
      cmd !== "B" &&
      cmd !== "v" &&
      cmd !== "h" &&
      cmd !== "p" &&
      cmd !== "?" &&
      cmd !== "!" &&
      cmd !== ":" &&
      cmd !== "+" &&
      cmd !== "r" &&
      cmd !== "-" &&
      cmd !== "t" &&
      cmd !== "T"
    ) {
      this.lastCommand = cmd;
    }
  }
}

module.exports = {
  DebugInterpreter
};
