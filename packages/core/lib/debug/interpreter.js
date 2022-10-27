const debugModule = require("debug");
const debug = debugModule("lib:debug:interpreter");

const path = require("path");
const util = require("util");

const DebugUtils = require("@truffle/debug-utils");
const selectors = require("@truffle/debugger").selectors;
const { session, sourcemapping, stacktrace, trace, evm, controller } =
  selectors;

const analytics = require("../services/analytics");
const repl = require("repl");

const { DebugPrinter } = require("./printer");

const Spinner = require("@truffle/spinners").Spinner;

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
    this.fetchExternal = config.fetchExternal;
    this.printer = new DebugPrinter(config, session);
    this.txHash = txHash;
    this.lastCommand = "n";
    this.enabledExpressions = new Set();
    this.repl = null;
  }

  async setOrClearBreakpoint(args, setOrClear) {
    const breakpoints = this.determineBreakpoints(args); //note: not pure, can print
    if (breakpoints !== null) {
      for (const breakpoint of breakpoints) {
        await this.setOrClearBreakpointObject(breakpoint, setOrClear);
      }
    } else {
      //null is a special value representing all, we'll handle it separately
      if (setOrClear) {
        // only "B all" is legal, not "b all"
        this.printer.print("Cannot add breakpoint everywhere.");
      } else {
        await this.session.removeAllBreakpoints();
        this.printer.print("Removed all breakpoints.");
      }
    }
  }

  //NOTE: not pure, also prints!
  //returns an array of the breakpoints, unless it's remove all breakpoints,
  //in which case it returns null
  //(if something goes wrong it will return [] to indicate do nothing)
  determineBreakpoints(args) {
    const currentLocation = this.session.view(controller.current.location);

    const currentStart = currentLocation.sourceRange
      ? currentLocation.sourceRange.start
      : null;
    const currentLength = currentLocation.sourceRange
      ? currentLocation.sourceRange.length
      : null;
    const currentSourceId = currentLocation.source
      ? currentLocation.source.id
      : null;
    const currentLine =
      currentSourceId !== null && currentSourceId !== undefined
        ? //sourceRange is never null, so we go by whether currentSourceId is null/undefined
          currentLocation.sourceRange.lines.start.line
        : null;

    if (args.length === 0) {
      //no arguments, want currrent node
      debug("node case");
      if (currentSourceId === null) {
        this.printer.print("Cannot determine current location.");
        return [];
      }
      return [
        {
          start: currentStart,
          line: currentLine, //this isn't necessary for the
          //breakpoint to work, but we use it for printing messages
          length: currentLength,
          sourceId: currentSourceId
        }
      ];
    }

    //the special case of "B all"
    else if (args[0] === "all") {
      return null;
    }

    //if the argument starts with a "+" or "-", we have a relative
    //line number
    else if (args[0][0] === "+" || args[0][0] === "-") {
      debug("relative case");
      if (currentLine === null) {
        this.printer.print("Cannot determine current location.");
        return [];
      }
      let delta = parseInt(args[0], 10); //want an integer
      debug("delta %d", delta);

      if (isNaN(delta)) {
        this.printer.print("Offset must be an integer.");
        return [];
      }

      return [
        {
          sourceId: currentSourceId,
          line: currentLine + delta
        }
      ];
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
        this.printer.print("Line number must be an integer.");
        return [];
      }

      //search sources for given string
      let sources = Object.values(
        this.session.view(sourcemapping.views.sources)
      );
      //we will indeed need the sources here, not just IDs
      let matchingSources = sources.filter(source =>
        source.sourcePath.includes(sourceArg)
      );

      if (matchingSources.length === 0) {
        this.printer.print(`No source file found matching ${sourceArg}.`);
        return [];
      } else if (matchingSources.length > 1) {
        //normally if there's multiple matching sources, we want to return no
        //breakpoint and print a disambiguation prompt.
        //however, if one of them has a source path that is a substring of all
        //the others...
        if (
          matchingSources.some(shortSource =>
            matchingSources.every(
              source =>
                typeof source.sourcePath !== "string" || //just ignore these I guess?
                source.sourcePath.includes(shortSource.sourcePath)
            )
          )
        ) {
          //exceptional case
          this.printer.print(
            `WARNING: Acting on all matching sources because disambiguation between them is not possible.`
          );
          return matchingSources.map(source => ({
            sourceId: source.id,
            line: line - 1 //adjust for breakpoint!
          }));
        } else {
          //normal case
          this.printer.print(
            `Multiple source files found matching ${sourceArg}.  Which did you mean?`
          );
          matchingSources.forEach(source =>
            this.printer.print(source.sourcePath)
          );
          this.printer.print("");
          return [];
        }
      }

      //otherwise, we found it!
      return [
        {
          sourceId: matchingSources[0].id,
          line: line - 1 //adjust for zero-indexing!
        }
      ];
    }

    //otherwise, it's a simple line number
    else {
      debug("absolute case");
      if (currentSourceId === null || currentSourceId === undefined) {
        this.printer.print("Cannot determine current file.");
        return [];
      }
      let line = parseInt(args[0], 10); //want an integer
      debug("line %d", line);

      if (isNaN(line)) {
        this.printer.print("Line number must be an integer.");
        return [];
      }

      return [
        {
          sourceId: currentSourceId,
          line: line - 1 //adjust for zero-indexing!
        }
      ];
    }
  }

  //note: also prints!
  async setOrClearBreakpointObject(breakpoint, setOrClear) {
    const existingBreakpoints = this.session.view(controller.breakpoints);
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
          "Nowhere to add breakpoint at or beyond that location."
        );
        return;
      }
    }

    const currentSource = this.session.view(controller.current.location.source);
    const currentSourceId = currentSource ? currentSource.id : null;

    //having constructed and adjusted breakpoint, here's now a
    //user-readable message describing its location
    let sources = this.session.view(sourcemapping.views.sources);
    let sourceNames = Object.assign(
      //note: only include user sources
      {},
      ...Object.entries(sources).map(([id, source]) => ({
        [id]: path.basename(source.sourcePath)
      }))
    );
    let locationMessage = DebugUtils.formatBreakpointLocation(
      breakpoint,
      true, //only relevant for node-based breakpoints
      currentSourceId,
      sourceNames
    );

    //one last check -- does this breakpoint already exist?
    let alreadyExists =
      existingBreakpoints.filter(
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
        this.printer.print(`Breakpoint at ${locationMessage} already exists.`);
        return;
      } else {
        this.printer.print(`No breakpoint at ${locationMessage} to remove.`);
        return;
      }
    }

    //finally, if we've reached this point, do it!
    //also report back to the user on what happened
    if (setOrClear) {
      await this.session.addBreakpoint(breakpoint);
      this.printer.print(`Breakpoint added at ${locationMessage}.`);
    } else {
      await this.session.removeBreakpoint(breakpoint);
      this.printer.print(`Breakpoint removed at ${locationMessage}.`);
    }
  }

  start(terminate) {
    // if terminate is not passed, return a Promise instead
    if (terminate === undefined) {
      return util.promisify(this.start.bind(this))();
    }

    if (this.session.view(session.status.loaded)) {
      debug("loaded");
      this.printer.printSessionLoaded();
    } else if (this.session.view(session.status.isError)) {
      debug("error!");
      this.printer.printSessionError();
    } else {
      debug("didn't attempt a load");
      this.printer.printHelp();
    }

    const prompt = this.session.view(session.status.loaded)
      ? DebugUtils.formatPrompt(this.network, this.txHash)
      : DebugUtils.formatPrompt(this.network);

    this.repl = repl.start({
      prompt: prompt,
      eval: util.callbackify(this.interpreter.bind(this)),
      ignoreUndefined: true,
      done: terminate
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
    splitArgs = cmd.trim().split(/ +/).slice(1);
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
      process.exit();
    }

    let alreadyFinished = this.session.view(trace.finishedOrUnloaded);
    let loadFailed = false;

    // If not finished, perform commands that require state changes
    // (other than quitting or resetting)
    if (!alreadyFinished) {
      const stepSpinner = new Spinner(
        "core:debug:interpreter:step",
        "Stepping..."
      );
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
      stepSpinner.remove();
    } //otherwise, inform the user we can't do that
    else {
      switch (cmd) {
        case "o":
        case "i":
        case "u":
        case "n":
        case "c":
        case ";":
          //are we "finished" because we've reached the end, or because
          //nothing is loaded?
          if (this.session.view(session.status.loaded)) {
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
      if (this.session.view(session.status.loaded)) {
        await this.session.reset();
      } else {
        this.printer.print("No transaction loaded.");
        this.printer.print("");
      }
    }
    if (cmd === "y") {
      if (this.session.view(session.status.loaded)) {
        if (this.session.view(trace.finished)) {
          if (!this.session.view(evm.current.step.isExceptionalHalting)) {
            const errorIndex = this.session.view(
              stacktrace.current.innerErrorIndex
            );
            if (errorIndex !== null) {
              const stepSpinner = new Spinner(
                "core:debug:interpreter:step",
                "Stepping..."
              );
              await this.session.reset();
              await this.session.advance(errorIndex);
              stepSpinner.remove();
            } else {
              this.printer.print("No error to return to.");
            }
          } else {
            this.printer.print("You are already at the final error.");
            this.printer.print(
              "Use the `Y` command to return to the previous error."
            );
            this.printer.print("");
          }
        } else {
          this.printer.print(
            "This command is only usable at end of transaction; did you mean `Y`?"
          );
        }
      } else {
        this.printer.print("No transaction loaded.");
        this.printer.print("");
      }
    }
    if (cmd === "Y") {
      if (this.session.view(session.status.loaded)) {
        const errorIndex = this.session.view(
          stacktrace.current.innerErrorIndex
        );
        if (errorIndex !== null) {
          const stepSpinner = new Spinner(
            "core:debug:interpreter:step",
            "Stepping..."
          );
          await this.session.reset();
          await this.session.advance(errorIndex);
          stepSpinner.remove();
        } else {
          this.printer.print("No previous error to return to.");
        }
      } else {
        this.printer.print("No transaction loaded.");
        this.printer.print("");
      }
    }
    if (cmd === "t") {
      if (!this.fetchExternal) {
        if (!this.session.view(session.status.loaded)) {
          const txSpinner = new Spinner(
            "core:debug:interpreter:step",
            DebugUtils.formatTransactionStartMessage()
          );
          try {
            await this.session.load(cmdArgs);
            txSpinner.succeed();
            this.repl.setPrompt(DebugUtils.formatPrompt(this.network, cmdArgs));
          } catch (_) {
            txSpinner.fail();
            loadFailed = true;
          }
        } else {
          loadFailed = true;
          this.printer.print(
            "Please unload the current transaction before loading a new one."
          );
        }
      } else {
        loadFailed = true;
        this.printer.print(
          "Cannot change transactions in fetch-external mode.  Please quit and restart the debugger instead."
        );
      }
    }
    if (cmd === "T") {
      if (!this.fetchExternal) {
        if (this.session.view(session.status.loaded)) {
          await this.session.unload();
          this.printer.print("Transaction unloaded.");
          this.repl.setPrompt(DebugUtils.formatPrompt(this.network));
        } else {
          this.printer.print("No transaction to unload.");
          this.printer.print("");
        }
      } else {
        this.printer.print(
          "Cannot change transactions in fetch-external mode.  Please quit and restart the debugger instead."
        );
      }
    }
    if (cmd === "g") {
      if (!this.session.view(controller.stepIntoInternalSources)) {
        this.session.setInternalStepping(true);
        this.printer.print(
          "All debugger commands can now step into generated sources."
        );
      } else {
        this.printer.print("Generated sources already activated.");
      }
    }
    if (cmd === "G") {
      if (this.session.view(controller.stepIntoInternalSources)) {
        this.session.setInternalStepping(false);
        this.printer.print(
          "Commands other than (;) and (c) will now skip over generated sources."
        );
      } else {
        this.printer.print("Generated sources already off.");
      }
    }

    // Check if execution has (just now) stopped.
    if (this.session.view(trace.finished) && !alreadyFinished) {
      this.printer.print("");
      //check if transaction failed
      if (!this.session.view(evm.transaction.status)) {
        await this.printer.printRevertMessage();
        this.printer.print("");
        this.printer.printStacktrace(true); //final stacktrace
        this.printer.print("");
        this.printer.printErrorLocation();
      } else {
        //case if transaction succeeded
        this.printer.print("Transaction completed successfully.");
        if (
          this.session.view(sourcemapping.current.source).language !== "Vyper"
        ) {
          //HACK: not supported for vyper yet
          await this.printer.printReturnValue();
        }
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
        this.printer.printGeneratedSourcesState();
        break;
      case "v":
        if (
          this.session.view(sourcemapping.current.source).language === "Vyper"
        ) {
          this.printer.print(
            "Decoding of variables is not currently supported for Vyper."
          );
          break;
        }

        //first: process which sections we should print out
        const tempPrintouts = this.updatePrintouts(
          splitArgs,
          this.printer.sections,
          this.printer.sectionPrintouts
        );

        await this.printer.printVariables(tempPrintouts);
        if (this.session.view(trace.finished)) {
          await this.printer.printReturnValue();
        }
        break;
      case "e":
        if (cmdArgs) {
          const eventsCount = parseInt(cmdArgs);
          if (!isNaN(eventsCount) && eventsCount > 0) {
            this.printer.eventsCount = eventsCount;
          } else if (cmdArgs === "all") {
            this.printer.eventsCount = Infinity;
          } else {
            this.printer.print(
              'Invalid event count given, must be positive integer or "all"'
            );
            break;
          }
        }
        if (this.session.view(session.status.loaded)) {
          this.printer.printEvents();
        } else {
          this.printer.print("No transaction loaded to print events for.");
        }
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
      case "p":
        // determine the numbers of instructions to be printed
        this.printer.instructionLines = this.parsePrintoutLines(
          splitArgs,
          this.printer.instructionLines
        );
        // process which locations we should print out
        const temporaryPrintouts = this.updatePrintouts(
          splitArgs,
          this.printer.locations,
          this.printer.locationPrintouts
        );

        if (this.session.view(session.status.loaded)) {
          if (this.session.view(trace.steps).length > 0) {
            this.printer.printInstruction(temporaryPrintouts);
            this.printer.printFile();
            this.printer.printState();
          } else {
            //if there are no trace steps, let's just print a warning message
            this.printer.print("No trace steps to inspect.");
          }
        }
        //finally, print watch expressions
        await this.printer.printWatchExpressionsResults(
          this.enabledExpressions
        );
        break;
      case "l":
        if (this.session.view(session.status.loaded)) {
          this.printer.printFile();
          // determine the numbers of lines to be printed
          this.printer.sourceLines = this.parsePrintoutLines(
            splitArgs,
            this.printer.sourceLines
          );
          this.printer.printState(
            this.printer.sourceLines.beforeLines,
            this.printer.sourceLines.afterLines
          );
        }
        break;
      case ";":
        if (!this.session.view(trace.finishedOrUnloaded)) {
          this.printer.printInstruction();
          this.printer.printFile();
          this.printer.printState();
        }
        await this.printer.printWatchExpressionsResults(
          this.enabledExpressions
        );
        break;
      case "s":
        if (this.session.view(session.status.loaded)) {
          //print final report if finished & failed, intermediate if not
          if (
            this.session.view(trace.finished) &&
            !this.session.view(evm.transaction.status)
          ) {
            this.printer.printStacktrace(true); //print final stack trace
            //Now: actually show the point where things went wrong
            this.printer.printErrorLocation(
              this.printer.sourceLines.beforeLines,
              this.printer.sourceLines.afterLines
            );
          } else {
            this.printer.printStacktrace(false); //intermediate call stack
          }
        }
        break;
      case "o":
      case "i":
      case "u":
      case "n":
      case "c":
      case "y":
      case "Y":
        if (!this.session.view(trace.finishedOrUnloaded)) {
          if (!this.session.view(sourcemapping.current.source).source) {
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
        if (this.session.view(session.status.loaded)) {
          this.printer.printAddressesAffected();
          this.printer.warnIfNoSteps();
          this.printer.printFile();
          this.printer.printState();
        }
        break;
      case "t":
        if (!loadFailed) {
          this.printer.printAddressesAffected();
          this.printer.warnIfNoSteps();
          this.printer.printFile();
          this.printer.printState();
        } else if (this.session.view(session.status.isError)) {
          let loadError = this.session.view(session.status.error);
          this.printer.print(loadError);
        }
        break;
      case "T":
      case "g":
      case "G":
        //nothing to print
        break;
      default:
        this.printer.printHelp(this.lastCommand);
    }

    const nonRepeatableCommands = "bBvhpl?!:+r-tTgGsye";
    if (!nonRepeatableCommands.includes(cmd)) {
      this.lastCommand = cmd;
    }
  }

  // update the printouts according to user inputs
  // called by case v for section printouts and case p for location printouts
  //
  // NOTE: THIS FUNCTION IS NOT PURE.
  //       The input printOuts is altered according to the values of other inputs: userArgs and selections.
  //       The function returns an object, tempPrintouts, that contains the selected printouts.
  updatePrintouts(userArgs, selections, printOuts) {
    let tempPrintouts = new Set();
    for (let argument of userArgs) {
      let fullSelection;
      if (argument[0] === "+" || argument[0] === "-") {
        fullSelection = argument.slice(1);
      } else {
        fullSelection = argument;
      }
      let selection = selections.find(possibleSelection =>
        fullSelection.startsWith(possibleSelection)
      );
      if (argument[0] === "+") {
        printOuts.add(selection);
      } else if (argument[0] === "-") {
        printOuts.delete(selection);
      } else {
        tempPrintouts.add(selection);
      }
    }
    for (let selection of printOuts) {
      debug("selection: %s", selection);
      tempPrintouts.add(selection);
    }
    return tempPrintouts;
  }

  // parse the numbers of lines options -<num>|+<num> from user args
  parsePrintoutLines(userArgs, currentLines) {
    let { beforeLines, afterLines } = currentLines;
    for (const argument of userArgs) {
      // ignore an option with length less than 2,such as a bare + or -
      if (argument.length < 2) continue;
      const newLines = Number(argument.slice(1));
      // ignore the arguments that are not of the correct form, number
      if (isNaN(newLines)) continue;
      if (argument[0] === "-") {
        beforeLines = newLines;
      } else if (argument[0] === "+") {
        afterLines = newLines;
      }
    }
    return { beforeLines, afterLines };
  }
}

module.exports = {
  DebugInterpreter
};
