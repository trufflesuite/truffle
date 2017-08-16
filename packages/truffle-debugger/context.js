var SolidityUtils = require("truffle-solidity-utils");
var CodeUtils = require("truffle-code-utils");

function Context(contract) {
  this.contract = contract;
  this.source = null;
  this.sourcePath = null;
  this.instructions = {
    create: [],
    call: []
  };
  this.binaries = {
    create: "",
    call: ""
  };
  this.programCounterMapping = {
    create: [],
    call: []
  };

  this.source = contract.source;
  this.sourcePath = contract.sourcePath;

  this.buildInstructionListAndSourceMap("create", contract.binary, contract.sourceMap);
  this.buildInstructionListAndSourceMap("call", contract.deployedBinary, contract.deployedSourceMap);
};

Context.prototype.buildInstructionListAndSourceMap = function(type, binary, sourceMap) {
  var self = this;

  this.binaries[type] = binary;

  var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(this.source);
  var sourceMap = SolidityUtils.getHumanReadableSourceMap(sourceMap);

  this.instructions[type] = CodeUtils.parseCode(binary);

  this.instructions[type].forEach(function(instruction, instructionIndex) {
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
    self.programCounterMapping[type][instruction.pc] = instruction;
  });
};

Context.prototype.instructionAtProgramCounter = function(type, programCounter) {
  return this.programCounterMapping[type][programCounter];
};

module.exports = Context;
