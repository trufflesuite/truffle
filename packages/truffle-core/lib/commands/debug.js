var command = {
  command: "debug",
  description:
    "Interactively debug any transaction on the blockchain (experimental)",
  builder: {
    _: {
      type: "string"
    }
  },
  help: {
    usage: "truffle debug <transaction_hash>",
    options: [
      {
        option: "<transaction_hash>",
        description: "Transaction ID to use for debugging. (required)"
      }
    ]
  },
  run: function(options, done) {
    var OS = require("os");
    var path = require("path");
    var debugModule = require("debug");
    var debug = debugModule("lib:commands:debug");
    var safeEval = require("safe-eval");
    var util = require("util");
    const BN = require("bn.js");
    const analytics = require("../services/analytics");

    // add custom inspect options for BNs
    BN.prototype[util.inspect.custom] = function(depth, options) {
      return options.stylize(this.toString(), "number");
    };

    var compile = require("truffle-compile");
    var Config = require("truffle-config");
    var Debugger = require("truffle-debugger");
    var DebugUtils = require("truffle-debug-utils");
    var Environment = require("../environment");
    var ReplManager = require("../repl");
    var selectors = require("truffle-debugger").selectors;

    // Debugger Session properties
    var trace = selectors.trace;
    var solidity = selectors.solidity;
    var controller = selectors.controller;

    var config = Config.detect(options);

    Environment.detect(config, function(err) {
      if (err) return done(err);

      if (config._.length === 0) {
        return done(
          new Error(
            "Please specify a transaction hash as the first parameter in order to " +
              "debug that transaction. i.e., truffle debug 0x1234..."
          )
        );
      }

      var txHash = config._[0];

      var lastCommand = "n";
      var enabledExpressions = new Set();

      let compilePromise = new Promise(function(accept, reject) {
        compile.all(config, function(err, contracts, files) {
          if (err) {
            return reject(err);
          }

          return accept({
            contracts: contracts,
            files: files
          });
        });
      });

      var sessionPromise = compilePromise
        .then(function(result) {
          config.logger.log(DebugUtils.formatStartMessage());

          return Debugger.forTx(txHash, {
            provider: config.provider,
            files: result.files,
            contracts: Object.keys(result.contracts).map(function(name) {
              var contract = result.contracts[name];
              return {
                contractName: contract.contractName || contract.contract_name,
                source: contract.source,
                sourcePath: contract.sourcePath,
                ast: contract.ast,
                binary: contract.binary || contract.bytecode,
                sourceMap: contract.sourceMap,
                deployedBinary:
                  contract.deployedBinary || contract.deployedBytecode,
                deployedSourceMap: contract.deployedSourceMap,
                compiler: contract.compiler
              };
            })
          });
        })
        .then(function(bugger) {
          return bugger.connect();
        })
        .catch(done);

      sessionPromise
        .then(async function(session) {
          if (err) return done(err);

          function splitLines(str) {
            // We were splitting on OS.EOL, but it turns out on Windows,
            // in some environments (perhaps?) line breaks are still denoted by just \n
            return str.split(/\r?\n/g);
          }

          function printAddressesAffected() {
            var affectedInstances = session.view(
              selectors.session.info.affectedInstances
            );

            config.logger.log("Addresses affected:");
            config.logger.log(
              DebugUtils.formatAffectedInstances(affectedInstances)
            );
          }

          function printHelp() {
            config.logger.log("");
            config.logger.log(DebugUtils.formatHelp());
          }

          function printFile() {
            var message = "";

            debug("about to determine sourcePath");
            var sourcePath = session.view(solidity.current.source).sourcePath;

            if (sourcePath) {
              message += path.basename(sourcePath);
            } else {
              message += "?";
            }

            config.logger.log("");
            config.logger.log(message + ":");
          }

          function printState() {
            var source = session.view(solidity.current.source).source;
            var range = session.view(solidity.current.sourceRange);
            debug("source: %o", source);
            debug("range: %o", range);

            if (!source) {
              config.logger.log();
              config.logger.log("1: // No source code found.");
              config.logger.log("");
              return;
            }

            var lines = splitLines(source);

            config.logger.log("");

            config.logger.log(DebugUtils.formatRangeLines(lines, range.lines));

            config.logger.log("");
          }

          function printInstruction() {
            var instruction = session.view(solidity.current.instruction);
            var step = session.view(trace.step);
            var traceIndex = session.view(trace.index);
            var totalSteps = session.view(trace.steps).length;

            config.logger.log("");
            config.logger.log(
              DebugUtils.formatInstruction(
                traceIndex + 1,
                totalSteps,
                instruction
              )
            );
            config.logger.log(DebugUtils.formatPC(step.pc));
            config.logger.log(DebugUtils.formatStack(step.stack));
            config.logger.log("");
            config.logger.log(step.gas + " gas remaining");
          }

          function select(expr) {
            let selector, result;

            try {
              selector = expr
                .split(".")
                .filter(function(next) {
                  return next.length > 0;
                })
                .reduce(function(sel, next) {
                  return sel[next];
                }, selectors);
            } catch (_) {
              throw new Error("Unknown selector: %s", expr);
            }

            // throws its own exception
            result = session.view(selector);

            return result;
          }

          /**
           * @param {string} selector
           */
          function printSelector(selector) {
            var result = select(selector);
            var debugSelector = debugModule(selector);
            debugSelector.enabled = true;
            debugSelector("%O", result);
          }

          function printWatchExpressions() {
            if (enabledExpressions.size === 0) {
              config.logger.log("No watch expressions added.");
              return;
            }

            config.logger.log("");
            enabledExpressions.forEach(function(expression) {
              config.logger.log("  " + expression);
            });
          }

          async function printWatchExpressionsResults() {
            debug("enabledExpressions %o", enabledExpressions);
            for (let expression of enabledExpressions) {
              config.logger.log(expression);
              // Add some padding. Note: This won't work with all loggers,
              // meaning it's not portable. But doing this now so we can get something
              // pretty until we can build more architecture around this.
              // Note: Selector results already have padding, so this isn't needed.
              if (expression[0] === ":") {
                process.stdout.write("  ");
              }
              await printWatchExpressionResult(expression);
            }
          }

          async function printWatchExpressionResult(expression) {
            var type = expression[0];
            var exprArgs = expression.substring(1);

            if (type === "!") {
              printSelector(exprArgs);
            } else {
              await evalAndPrintExpression(exprArgs, 2, true);
            }
          }

          // TODO make this more robust for all cases and move to
          // truffle-debug-utils
          function formatValue(value, indent) {
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
                var padding = i > 0 ? Array(indent).join(" ") : "";
                return padding + line;
              })
              .join(OS.EOL);
          }

          async function printVariables() {
            let variables = await session.variables();

            debug("variables %o", variables);

            // Get the length of the longest name.
            var longestNameLength = Math.max.apply(
              null,
              Object.keys(variables).map(function(name) {
                return name.length;
              })
            );

            config.logger.log();

            Object.keys(variables).forEach(function(name) {
              var paddedName = name + ":";

              while (paddedName.length <= longestNameLength) {
                paddedName = " " + paddedName;
              }

              var value = variables[name];
              var formatted = formatValue(value, longestNameLength + 5);

              config.logger.log("  " + paddedName, formatted);
            });

            config.logger.log();
          }

          /**
           * Convert all !<...> expressions to JS-valid selector requests
           */
          function preprocessSelectors(expr) {
            const regex = /!<([^>]+)>/g;
            const select = "$"; // expect repl context to have this func
            const replacer = (_, selector) => `${select}("${selector}")`;

            return expr.replace(regex, replacer);
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
          async function evalAndPrintExpression(raw, indent, suppress) {
            let variables = await session.variables();

            //if we're just dealing with a single variable, handle that case
            //separately (so that we can do things in a better way for that
            //case)

            let variable = raw.trim();
            if (variable in variables) {
              let formatted = formatValue(variables[variable], indent);
              config.logger.log(formatted);
              config.logger.log();
              return;
            }

            //HACK
            //if we're not in the single-variable case, we'll need to do some
            //things to Javascriptify our variables so that the JS syntax for
            //using them is closer to the Solidity syntax
            variables = DebugUtils.nativize(variables);

            var context = Object.assign(
              { $: select },

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
              new RegExp(
                "(?<![a-zA-Z0-9_$])" + pseudoThis + "(?![a-zA-Z0-9_$])"
              ),
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
              var result = safeEval(expr, context);
              result = DebugUtils.cleanConstructors(result); //HACK
              var formatted = formatValue(result, indent);
              config.logger.log(formatted);
              config.logger.log();
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
                config.logger.log(e);
              } else {
                config.logger.log(formatValue(undefined));
              }
            }
          }

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

          async function setOrClearBreakpoint(args, setOrClear) {
            //setOrClear: true for set, false for clear
            var currentLocation = session.view(controller.current.location);
            var breakpoints = session.view(controller.breakpoints);

            var currentLine = currentLocation.sourceRange.lines.start.line;
            var currentSourceId = currentLocation.source.id;
            //don't get node id unless we have to as workaround to problem
            //where it has sometimes turned up undefined

            var sourceName; //to be used if a source is entered

            var breakpoint = {};

            debug("args %O", args);

            if (args.length === 0) {
              //no arguments, want currrent node
              debug("node case");
              breakpoint.node = currentLocation.node.id;
              breakpoint.line = currentLine;
              breakpoint.sourceId = currentSourceId;
            }

            //the special case of "B all"
            else if (args[0] === "all") {
              if (setOrClear) {
                // only "B all" is legal, not "b all"
                config.logger.log("Cannot add breakpoint everywhere.\n");
                return;
              }
              await session.removeAllBreakpoints();
              config.logger.log("Removed all breakpoints.\n");
              return;
            }

            //if the argument starts with a "+" or "-", we have a relative
            //line number
            else if (args[0][0] === "+" || args[0][0] === "-") {
              debug("relative case");
              let delta = parseInt(args[0], 10); //want an integer
              debug("delta %d", delta);

              if (isNaN(delta)) {
                config.logger.log("Offset must be an integer.\n");
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
                config.logger.log("Line number must be an integer.\n");
                return;
              }

              //search sources for given string
              let sources = session.view(solidity.info.sources);

              //we will indeed need the sources here, not just IDs
              let matchingSources = Object.values(sources).filter(source =>
                source.sourcePath.includes(sourceArg)
              );

              if (matchingSources.length === 0) {
                config.logger.log(
                  `No source file found matching ${sourceArg}.\n`
                );
                return;
              } else if (matchingSources.length > 1) {
                config.logger.log(
                  `Multiple source files found matching ${sourceArg}.  Which did you mean?`
                );
                matchingSources.forEach(source =>
                  config.logger.log(source.sourcePath)
                );
                config.logger.log("");
                return;
              }

              //otherwise, we found it!
              sourceName = path.basename(matchingSources[0].sourcePath);
              breakpoint.sourceId = matchingSources[0].id;
              breakpoint.line = line - 1; //adjust for zero-indexing!
            }

            //otherwise, it's a simple line number
            else {
              debug("absolute case");
              let line = parseInt(args[0], 10); //want an integer
              debug("line %d", line);

              if (isNaN(line)) {
                config.logger.log("Line number must be an integer.\n");
                return;
              }

              breakpoint.sourceId = currentSourceId;
              breakpoint.line = line - 1; //adjust for zero-indexing!
            }

            //having constructed the breakpoint, here's now a user-readable
            //message describing its location
            let locationMessage;
            if (breakpoint.node !== undefined) {
              locationMessage = `this point in line ${breakpoint.line + 1}`;
              //+1 to adjust for zero-indexing
            } else if (breakpoint.sourceId !== currentSourceId) {
              //note: we should only be in this case if a source was entered!
              //if no source as entered and we are here, something is wrong
              locationMessage = `line ${breakpoint.line + 1} in ${sourceName}`;
              //+1 to adjust for zero-indexing
            } else {
              locationMessage = `line ${breakpoint.line + 1}`;
              //+1 to adjust for zero-indexing
            }

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
                config.logger.log(
                  `Breakpoint at ${locationMessage} already exists.\n`
                );
                return;
              } else {
                config.logger.log(
                  `No breakpoint at ${locationMessage} to remove.\n`
                );
                return;
              }
            }

            //finally, if we've reached this point, do it!
            //also report back to the user on what happened
            if (setOrClear) {
              await session.addBreakpoint(breakpoint);
              config.logger.log(`Breakpoint added at ${locationMessage}.\n`);
            } else {
              await session.removeBreakpoint(breakpoint);
              config.logger.log(`Breakpoint removed at ${locationMessage}.\n`);
            }
            return;
          }

          async function interpreter(cmd) {
            cmd = cmd.trim();
            var cmdArgs, splitArgs;
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
              cmd = lastCommand;
              cmdArgs = "";
              splitArgs = [];
            }

            //quit if that's what we were given
            if (cmd === "q") {
              return await util.promisify(repl.stop.bind(repl))();
            }

            let alreadyFinished = session.view(trace.finished);

            // If not finished, perform commands that require state changes
            // (other than quitting or resetting)
            if (!alreadyFinished) {
              switch (cmd) {
                case "o":
                  await session.stepOver();
                  break;
                case "i":
                  await session.stepInto();
                  break;
                case "u":
                  await session.stepOut();
                  break;
                case "n":
                  await session.stepNext();
                  break;
                case ";":
                  //two cases -- parameterized and unparameterized
                  if (cmdArgs !== "") {
                    let count = parseInt(cmdArgs, 10);
                    debug("cmdArgs=%s", cmdArgs);
                    if (isNaN(count)) {
                      config.logger.log("Number of steps must be an integer.");
                      break;
                    }
                    await session.advance(count);
                  } else {
                    await session.advance();
                  }
                  break;
                case "c":
                  await session.continueUntilBreakpoint();
                  break;
              }
            } //otherwise, inform the user we can't do that
            else {
              switch (cmd) {
                case "o":
                case "i":
                case "u":
                case "n":
                case ";":
                case "c":
                  config.logger.log("Transaction has halted; cannot advance.");
                  config.logger.log("");
              }
            }
            if (cmd === "r") {
              //reset if given the reset command
              await session.reset();
            }

            // Check if execution has (just now) stopped.
            if (session.view(trace.finished) && !alreadyFinished) {
              config.logger.log("");
              //check if transaction failed
              if (!session.view(selectors.session.transaction.receipt).status) {
                config.logger.log("Transaction halted with a RUNTIME ERROR.");
                config.logger.log("");
                config.logger.log(
                  "This is likely due to an intentional halting expression, like assert(), require() or revert(). It can also be due to out-of-gas exceptions. Please inspect your transaction parameters and contract code to determine the meaning of this error."
                );
              } else {
                //case if transaction succeeded
                config.logger.log("Transaction completed successfully.");
              }
            }

            // Perform post printing
            // (we want to see if execution stopped before printing state).
            switch (cmd) {
              case "+":
                if (cmdArgs[0] === ":") {
                  watchExpressionAnalytics(cmdArgs.substring(1));
                }
                enabledExpressions.add(cmdArgs);
                await printWatchExpressionResult(cmdArgs);
                break;
              case "-":
                enabledExpressions.delete(cmdArgs);
                break;
              case "!":
                printSelector(cmdArgs);
                break;
              case "?":
                printWatchExpressions();
                break;
              case "v":
                await printVariables();
                break;
              case ":":
                watchExpressionAnalytics(cmdArgs);
                evalAndPrintExpression(cmdArgs);
                break;
              case "b":
                await setOrClearBreakpoint(splitArgs, true);
                break;
              case "B":
                await setOrClearBreakpoint(splitArgs, false);
                break;
              case ";":
              case "p":
                printFile();
                printInstruction();
                printState();
                await printWatchExpressionsResults();
                break;
              case "o":
              case "i":
              case "u":
              case "n":
              case "c":
                if (!session.view(trace.finished)) {
                  if (!session.view(solidity.current.source).source) {
                    printInstruction();
                  }

                  printFile();
                  printState();
                }
                await printWatchExpressionsResults();
                break;
              case "r":
                printAddressesAffected();
                printFile();
                printState();
                break;
              default:
                printHelp();
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
              cmd !== "-"
            ) {
              lastCommand = cmd;
            }
          }

          printAddressesAffected();
          printHelp();
          debug("Help printed");
          printFile();
          debug("File printed");
          printState();
          debug("State printed");

          var repl = options.repl || new ReplManager(config);

          repl.start({
            prompt:
              "debug(" +
              config.network +
              ":" +
              txHash.substring(0, 10) +
              "...)> ",
            interpreter: util.callbackify(interpreter),
            ignoreUndefined: true,
            done: done
          });
        })
        .catch(done);
    });
  }
};

module.exports = command;
