var SolidityUtils = require("truffle-solidity-utils");
var CodeUtils = require("truffle-code-utils");

function Context(contract) {
  if (typeof contract == "string") {
    contract = {
      binary: contract,
      deployedBinary: contract,
      source: null,
      sourcePath: null,
      contractName: "?"
    }

    var instructions = CodeUtils.parseCode(contract.binary);
    var sourceMap = "";

    // Let's create a source map to use since none exists. This source map
    // maps just as many ranges as there are instructions, and ensures every
    // instruction is marked as "jumping out". This will ensure all
    // available debugger commands step one instruction at a time.
    //
    // This is kindof a hack; perhaps this should be broken out into separate
    // context types. TODO
    for (var i = 0; i < instructions.length; i++) {
      sourceMap += i + ":" + i + ":1:o;";
    }

    contract.sourceMap = sourceMap;
    contract.deployedSourceMap = sourceMap;
  }

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

  var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(this.source || "");
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
