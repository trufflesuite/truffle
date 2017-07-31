var SolidityUtils = require("truffle-solidity-utils");
var CodeUtils = require("truffle-code-utils");

function Context(address, web3, isContractCreation) {
  this.address = address;
  this.web3 = web3;
  this.isContractCreation = !!isContractCreation;
  this.deployedBinary = null;
  this.executedBinary = null;
  this.match = null;
  this.source = null;
  this.sourcePath = null;
  this.executedSourceMap = null;
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

  if (!match.source) {
    throw new Error("Could not find source code for matching transaction (not included in artifacts). Usually this is fixed by recompiling your contracts with the latest version of Truffle.");
  }

  self.match = match;
  self.source = match.source;
  self.sourcePath = match.sourcePath;

  var sourceMapErrorMessage = "Found matching contract for transaction but could not find associated source map: Unable to debug. Usually this is fixed by recompiling your contracts with the latest version of Truffle.";

  if (self.isContractCreation) {
    if (!match.sourceMap) {
      throw new Error(sourceMapErrorMessage);
    }
    this.executedSourceMap = match.sourceMap;
    this.executedBinary = match.binary;
  } else {
    if (!match.deployedSourceMap) {
      throw new Error(sourceMapErrorMessage);
    }
    this.executedSourceMap = match.deployedSourceMap;
    this.executedBinary = match.deployedBinary;
  }
};

Context.prototype.buildInstructionListAndSourceMap = function() {
  var self = this;

  var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(this.source);
  var sourceMap = SolidityUtils.getHumanReadableSourceMap(this.executedSourceMap);

  this.instructions = CodeUtils.parseCode(this.executedBinary);

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
    }

    // Use this loop to create a mapping between program counters and instructions.
    self.programCounterToInstructionMapping[instruction.pc] = instruction;
  });
};

Context.prototype.instructionAtProgramCounter = function(programCounter) {
  return this.programCounterToInstructionMapping[programCounter];
};

module.exports = Context;
