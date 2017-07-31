var expect = require("truffle-expect");
var contract = require("truffle-contract");
var Web3 = require("web3");
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var OS = require("os");
var Context = require("./context");
var Call = require("./call");

function Debugger(config) {
  this.config = config;
  this.tx_hash;
  this.trace = [];
  this.traceIndex = 0;
  this.callstack = [];
  this.contexts = {};
  this.started = false;
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

      // Gather all available contracts
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

          self.tx_hash = tx_hash;

          // Analyze the trace and create contexts for each address
          // Of course, we push the addres of the initial contract called.
          self.contexts[tx.to] = new Context(tx.to, web3);

          self.trace.forEach(function(step, index) {
            if (step.op == "CALL" || step.op == "DELEGATECALL") {
              var address = self.callAddress(step);
              self.contexts[address] = new Context(address, web3);
            }
          });

          // Have all the contexts gather up associated information necessary.
          var promises = Object.keys(self.contexts).map(function(address) {
            return self.contexts[address].initialize(contracts);
          });

          Promise.all(promises).then(function() {
            self.traceIndex = 0;
            self.callstack.push(new Call(self.contexts[tx.to]));

            self.started = true;

            callback(null, self.contexts);
          }).catch(callback);
        });
      });
    });
  });
};

Debugger.prototype.currentInstruction = function() {
  var currentCall = this.currentCall();

  if (!currentCall) return null;

  return currentCall.currentInstruction();
};

/**
 * currentCall - get call on the top of the call stack
 * @return {Call} call on the top of the call stack
 */
Debugger.prototype.currentCall = function() {
  return this.callstack[this.callstack.length - 1];
}

/**
 * functionDepth - get the depth of jumps made relative to Solidity functions
 *
 * Specific jumps are marked as either entering or leaving a function.
 * functionDepth() expresses the amount of functions calls currently made.
 *
 * @return {[type]} [description]
 */
Debugger.prototype.functionDepth = function() {
  return this.callstack.reduce(function(sum, call) {
    return call.functionDepth;
  }, 0);
};

/**
 * advance - advanced one instruction
 * @return Object Returns the current instruction after incrementing one instruction.
 */
Debugger.prototype.advance = function() {
  var currentInstruction;

  if (this.isCall()) {
    this.executeCall();
    this.traceIndex += 1;
  } else {
    if (this.isSuccessfulHaltingInstruction()) {
      this.callstack.pop();
    }

    if (this.isStopped()) {
      return null;
    }

    var currentCall = this.callstack[this.callstack.length - 1];
    var currentStep = this.getStep();
    currentCall.advance(currentStep.stack);
    this.traceIndex += 1;
  }

  currentInstruction = this.currentInstruction();

  if (currentInstruction) {
    // Determine if instruction matches traceIndex
    var step = this.getStep();

    // Note that we may not have a next step as expected.
    // In cases of runtime errors, normal halting instructions
    // won't be executed.
    if (step && step.op != currentInstruction.name) {

      // TODO: Probably shouldn't handle this error like this.
      this.config.logger.log("ERROR: Trace and instruction mismatch.");
      this.config.logger.log("");
      this.config.logger.log("trace", step);
      this.config.logger.log("instruction", currentInstruction)

      this.config.logger.log("");
      this.config.logger.log("This is likely due to a bug in the debugger. Please file an issue on the Truffle issue tracker and provide as much information about your code and transaction as possible.")
      this.config.logger.log("");

      throw new Error("Fatal error: See above.")
    }
  }

  return currentInstruction;
}

/**
 * step - step to the next logical code segment
 *
 * Note: It might take multiple instructions to express the same section of code.
 * "Stepping", then, is stepping to the next logical item, not stepping to the next
 * instruction. See advance() if you'd like to advance by one instruction.
 *
 * @return object Returns the current instruction stepped to.
 */
Debugger.prototype.step = function() {
  if (this.isStopped()) {
    return;
  }

  var startingInstruction = this.currentInstruction();

  while (this.currentInstruction().start == startingInstruction.start && this.currentInstruction().length == startingInstruction.length) {
    this.advance();

    if (this.isStopped()) {
      break;
    }
  }

  return this.currentInstruction();
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

  var startingInstruction = this.currentInstruction();
  var startingDepth = this.functionDepth();

  // If we're directly on a jump, then just do it.
  if (this.isJump(startingInstruction)) {
    return this.step();
  }

  if (this.hasMultiLineCodeRange(startingInstruction)) {
    return this.stepOver();
  }

  // So we're not directly on a jump: step until we either
  // find a jump or get out of the code range.
  while (true) {
    var newInstruction = this.step();

    if (this.isStopped()) {
      break;
    }

    // Check to see if we've made our jump. If so, get outta here.
    if (this.functionDepth() > startingDepth) {
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

  return this.currentInstruction();
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

  var startingInstruction = this.currentInstruction();
  var startingDepth = this.functionDepth();

  while (this.functionDepth() >= startingDepth) {
    this.step();

    if (this.isStopped()) {
      break;
    }
  }

  return this.currentInstruction();
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

  var startingInstruction = this.currentInstruction();
  var startingDepth = this.functionDepth();
  var startingCallDepth = this.callstack.length;

  while (true) {
    var newInstruction = this.step();
    var newCallDepth = this.callstack.length;

    if (this.isStopped()) {
      break;
    }

    // If stepping over caused us to step out of a contract, quit.
    if (newCallDepth < startingCallDepth) {
      break;
    }

    // If we encountered a new line, bail, but only do it when we're at the same functionDepth
    // (i.e., don't step into any new function calls). However, be careful to stop stepping
    // if we step out of the function.
    if (newCallDepth == startingCallDepth && newInstruction.range.start.line != startingInstruction.range.start.line && this.functionDepth() <= startingDepth) {
      break;
    }
  }

  return this.currentInstruction();
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
Debugger.prototype.currentSource = function() {
  return this.callstack[this.callstack.length - 1].context.source;
};

Debugger.prototype.currentSourcePath = function() {
  return this.callstack[this.callstack.length - 1].context.sourcePath;
};

Debugger.prototype.getTraceAtIndex = function(index) {
  return this.trace[index];
};

Debugger.prototype.getStep = function() {
  return this.trace[this.traceIndex];
};

Debugger.prototype.isJump = function(instruction) {
  if (!instruction) {
    instruction = this.currentInstruction();
  }
  return instruction.name != "JUMPDEST" && instruction.name.indexOf("JUMP") == 0;
};

Debugger.prototype.isCall = function(instruction) {
  if (!instruction) {
    instruction = this.currentInstruction();
  }
  return instruction.name == "CALL" || instruction.name == "DELEGATECALL";
};

Debugger.prototype.isSuccessfulHaltingInstruction = function(instruction) {
  if (!instruction) {
    instruction = this.currentInstruction();
  }
  return instruction.name == "STOP" || instruction.name == "RETURN";
};

Debugger.prototype.hasMultiLineCodeRange = function(instruction) {
  return instruction.range.start.line != instruction.range.end.line;
};

Debugger.prototype.executeCall = function() {
  var step = this.trace[this.traceIndex];
  var address = this.callAddress(step);
  var newContext = this.contexts[address];
  var newCall = new Call(newContext);
  this.callstack.push(newCall);
};

Debugger.prototype.callAddress = function(step) {
  var address = step.stack[step.stack.length - 2];

  // Remove leading zeroes from address.
  while (address.length > 40) {
    address = address.substring(1);
  }

  address = "0x" + address;

  return address;
};

/**
 * isStopped - determine whether the debugger is currently debugging a transaction
 * @return Boolean true if stopped; false if still debugging
 */
Debugger.prototype.isStopped = function() {
  return this.traceIndex >= this.trace.length || this.callstack.length == 0;
}

Debugger.prototype.isRuntimeError = function() {
  return this.traceIndex >= this.trace.length && this.callstack.length > 0;
};

module.exports = Debugger;
