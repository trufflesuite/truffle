var SolidityUtils = require("truffle-solidity-utils");
var CodeUtils = require("truffle-code-utils");

function Context(address, web3) {
  this.address = address;
  this.web3 = web3;
  this.deployedBinary = null;
  this.source = null;
  this.match = null;
  this.programCounterToInstructionMapping = {};
};

Context.prototype.initialize = function(contracts) {
  var self = this;
  return this.getCode().then(function() {
    self.findMatch(contracts);
    self.buildInstructionListAndSourceMap();
  });
};

Context.prototype.getCode = function() {
  var self = this;
  return new Promise(function(accept, reject) {
    self.web3.eth.getCode(self.address, function(err, deployedBinary) {
      if (err) return reject(err);
      self.deployedBinary = deployedBinary;
      accept();
    });
  });
};

Context.prototype.findMatch = function(contracts) {
  var self = this;

  var match = null;

  for (var i = 0; i < contracts.length; i++) {
    var current = contracts[i];

    if (current.deployedBinary == self.deployedBinary) {
      match = current;
      break;
    }
  }

  if (!match) {
    return;
  }

  if (!match.deployedSourceMap) {
    throw new Error("Found matching contract for transaction but could not find associated source map: Unable to debug. Usually this is fixed by recompiling your contracts with the latest version of Truffle.");
  }

  if (!match.source) {
    throw new Error("Could not find source code for matching transaction (not include in artifacts). Usually this is fixed by recompiling your contracts with the latest version of Truffle.");
  }

  self.match = match;
  self.source = match.source;
  self.deployedSourceMap = match.deployedSourceMap;
};

Context.prototype.buildInstructionListAndSourceMap = function() {
  var self = this;

  var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(this.match.source);
  var sourceMap = SolidityUtils.getHumanReadableSourceMap(this.match.deployedSourceMap);

  this.instructions = CodeUtils.parseCode(this.deployedBinary);

  this.instructions.forEach(function(instruction, instructionIndex) {
    var sourceMapInstruction = sourceMap[instructionIndex];

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
    self.programCounterToInstructionMapping[instruction.pc] = instruction;
  });
};

Context.prototype.instructionAtProgramCounter = function(programCounter) {
  return this.programCounterToInstructionMapping[programCounter];
};

module.exports = Context;
