var SolidityUtils = require("truffle-solidity-utils");
var CodeUtils = require("truffle-code-utils");
var expect = require("truffle-expect");
var contract = require("truffle-contract");
var Web3 = require("web3");
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var OS = require("os");

function Debugger(config) {
  this.config = config;
  this.tx_hash;
  this.trace = [];
  this.traceIndex = 0;
  this.currentInstruction = null;
  this.callDepth = 0;
  this.matches = null;
}

/**
 * Function: debug
 *
 * Debug a specific transaction that occurred on the blockchain
 *
 * @param  {[type]}   tx_hash  [description]
 * @param  {[type]}   config   [description]
 * @param  {Function} callback [description]
 * @return [type]              [description]
 */

Debugger.prototype.start = function(tx_hash, callback) {
  var self = this;

  expect.options(this.config, [
    "provider",
    "resolver"
  ]);

  // Strategy:
  // 1. Get trace for tx
  // 2. Get the deployed bytecode at the to address of the transaction
  // 3. Find contract that matches bytecode if known
  // 4. Get instruction source map
  // 5. Convert deployed bytecode to instructions
  // 6. Map trace to instructions, and parse source ranges

  var web3 = new Web3();
  web3.setProvider(this.config.provider);

  this.config.provider.sendAsync({
    jsonrpc: "2.0",
    method: "debug_traceTransaction",
    params: [tx_hash],
    id: new Date().getTime()
  }, function(err, result) {
    if (err) return callback(err);

    if (result.error) {
      return callback(new Error("The debugger receieved an error while requesting the transaction trace. Ensure your Ethereum client supports transaction traces and that the transaction reqeusted exists on chain before debugging." + OS.EOL + OS.EOL + result.error.message));
    }

    self.trace = result.result.structLogs;

    // Get the transaction itself
    web3.eth.getTransaction(tx_hash, function(err, tx) {
      if (err) return callback(err);

      if (tx.to == null) {
        return callback(new Error("This debugger does not currently support contract creation."));
      }

      web3.eth.getCode(tx.to, function(err, deployedBinary) {
        if (err) return callback(err);

        // Go through all known contracts looking for matching deployedBinary.
        dir.files(self.config.contracts_build_directory, function(err, files) {
          if (err) return callback(err);

          var contracts = files.filter(function(file_path) {
            return path.extname(file_path) == ".json";
          }).map(function(file_path) {
            return path.basename(file_path, ".json");
          }).map(function(contract_name) {
            return self.config.resolver.require(contract_name);
          });

          async.each(contracts, function(abstraction, finished) {
            abstraction.detectNetwork().then(function() {
              finished();
            }).catch(finished);
          }, function(err) {
            if (err) return callback(err);

            var matches = null;

            for (var i = 0; i < contracts.length; i++) {
              var current = contracts[i];

              if (current.deployedBinary == deployedBinary) {
                matches = current;
                break;
              }
            }

            if (!matches) {
              return callback(new Error("Could not find compiled artifacts for the specified transaction. Ensure the transaction you're debugging is related to a contract you've deployed using the Truffle version you have currently installed."));
            }

            if (!matches.deployedSourceMap) {
              return callback(new Error("Found matching contract for transaction but could not find associated source map: Unable to debug. Usually this is fixed by recompiling your contracts with the latest version of Truffle."));
            }

            if (!matches.source) {
              return callback(new Error("Could not find source code for matching transaction (not include in artifacts). Usually this is fixed by recompiling your contracts with the latest version of Truffle."))
            }

            // Alright, so if we're here, it means we have:
            //
            // 1. the contract associated with the current transaction
            // 2. the deployed source map for the current contract associated with the transaction
            // 3. the source associated with the current contract
            // 4. a full transaction trace
            //
            // Now we need to mix all this data together to match the trace with contract code.

            self.matches = matches;
            self.tx_hash = tx_hash;

            var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(matches.source);

            var instructions = CodeUtils.parseCode(deployedBinary);
            var programCounterToInstructionMapping = {};

            instructions.forEach(function(instruction, instructionIndex) {
              var sourceMapInstruction = SolidityUtils.getInstructionFromSourceMap(instructionIndex, matches.deployedSourceMap);

              instruction.index = instructionIndex;

              if (sourceMapInstruction) {
                instruction.jump = sourceMapInstruction.jump;
                instruction.start = sourceMapInstruction.start;
                instruction.length = sourceMapInstruction.length;
                instruction.range = {
                  start: lineAndColumnMapping[sourceMapInstruction.start],
                  end: lineAndColumnMapping[sourceMapInstruction.start + sourceMapInstruction.length]
                }
                instruction.srcmap = sourceMapInstruction;
              }

              // Use this loop to create a mapping between program counters and instructions.
              programCounterToInstructionMapping[instruction.pc] = instruction;
            });

            // Merge trace with source location mapping.
            self.trace.forEach(function(step, index) {
              step.instruction = programCounterToInstructionMapping[step.pc];

              if (step.instruction) {
                step.instruction.traceIndex = index;
              }
            });

            self.traceIndex = 0;
            self.callDepth = 0;
            self.currentInstruction = self.trace[self.traceIndex].instruction;

            callback();
          });
        });
      });
    });
  });
};

/**
 * stepInstruction - step to the next instruction
 * @return Object Returns the current instruction stepped to.
 */
Debugger.prototype.stepInstruction = function() {
  // If this is executed, it's assumed this.currentInstruction is non-null.
  // this.currentInstruction is the last instruction at this point.
  if (this.currentInstruction.jump == "i") {
    this.callDepth += 1;
  }

  if (this.currentInstruction.jump == "o") {
    this.callDepth -= 1;
  }

  // Move to the next instruction
  this.traceIndex += 1;

  if (this.traceIndex >= this.trace.length) {
    this.currentInstruction = null;
  } else {
    this.currentInstruction = this.trace[this.traceIndex].instruction;
  }

  return this.currentInstruction;
}

/**
 * step - step to the next logical code segment
 *
 * Note: It might take multiple instructions to express the same section of code.
 * "Stepping", then, is stepping to the next logical item, not stepping
 * to the next instruction.
 *
 * @return object Returns the current instruction stepped to.
 */
Debugger.prototype.step = function() {
  if (this.isStopped()) {
    return;
  }

  var startingInstruction = this.currentInstruction;

  while (this.currentInstruction.start == startingInstruction.start && this.currentInstruction.length == startingInstruction.length) {
    this.stepInstruction();

    if (this.isStopped()) {
      break;
    }
  }

  return this.currentInstruction;
};

/**
 * stepInto - step into the current function
 *
 * Conceptually this is easy, but from a programming standpoint it's hard.
 * Code like `getBalance(msg.sender)` might be highlighted, but there could
 * be a number of different intermediate steps (like evaluating `msg.sender`)
 * before `getBalance` is stepped into. This function will step into the first
 * function available (where instruction.jump == "i"), ignoring any intermediate
 * steps that fall within the same code range. If there's a step encountered
 * that exists outside of the range, then stepInto will only execute until that
 * step.
 *
 * @return object Returns the current instruction stepped to.
 */
Debugger.prototype.stepInto = function() {
  if (this.isStopped()) {
    return;
  }

  var startingInstruction = this.currentInstruction;
  var startingDepth = this.callDepth;

  // If we're directly on a jump, then just do it.
  if (startingInstruction.jump == "i") {
    return this.step();;
  }

  // So we're not directly on a jump: step until we either
  // find a jump or get out of the code range.
  while (true) {
    var newInstruction = this.step();

    if (this.isStopped()) {
      break;
    }

    // Check to see if we've made our jump. If so, get outta here.
    if (this.callDepth > startingDepth) {
      break;
    }

    var lowerBounds = startingInstruction.start;
    var upperBounds = startingInstruction.start + startingInstruction.length;

    var newInstructionStart = newInstruction.start;
    var newInstructionEnd = newInstruction.start + newInstruction.length;

    // If we have a new instruction that exists outside of the starting range,
    // then the starting instruction must not have been one that jumps anywhere.
    if (newInstructionStart < lowerBounds || newInstructionEnd > upperBounds) {
      break;
    }
  }

  return this.currentInstruction;
};

/**
 * stepOut - step out of the current function
 *
 * This will run until the debugger encounters a decrease in call depth.
 *
 * @return [type]              [description]
 */
Debugger.prototype.stepOut = function() {
  if (this.isStopped()) {
    return;
  }

  var startingInstruction = this.currentInstruction;
  var startingDepth = this.callDepth;

  while (this.callDepth >= startingDepth) {
    this.step();

    if (this.isStopped()) {
      break;
    }
  }

  return this.currentInstruction;
};

/**
 * stepOver - step over the current line
 *
 * Step over the current line. Will step to the next instruction that
 * exists on a different line of code.
 *
 * @return Object Returns the current instruction stepped to.
 */
Debugger.prototype.stepOver = function() {
  if (this.isStopped()) {
    return;
  }

  var startingInstruction = this.currentInstruction;
  var startingDepth = this.callDepth;

  while (true) {
    var newInstruction = this.step();

    if (this.isStopped()) {
      break;
    }

    // If we encountered a new line, bail, but only do it when we're at the same callDepth
    // (i.e., don't step into any new function calls). However, be careful to stop stepping
    // if we step out of the function.
    if (newInstruction.range.start.line != startingInstruction.range.start.line && this.callDepth <= startingDepth) {
      break;
    }
  }

  return this.currentInstruction;
};

/**
 * run - run until a breakpoint is hit or execution stops.
 *
 * @return Object Returns the current instruction stepped to.
 */
Debugger.prototype.run = function() {
  // TODO
};

/**
 * getSource - get the source file that produced the current instruction
 * @return String Full source code that produced the current instruction
 */
Debugger.prototype.getSource = function() {
  return this.matches.source;
};

Debugger.prototype.getTraceAtIndex = function(index) {
  return this.trace[index];
};

/**
 * isStopped - determine whether the debugger is currently debugging a transaction
 * @return Boolean true if stopped; false if still debugging
 */
Debugger.prototype.isStopped = function() {
  return this.currentInstruction == null;
}

module.exports = Debugger;
