var SolidityUtils = require("truffle-solidity-utils");
var CodeUtils = require("truffle-code-utils");

function Context(binary, sourceMap, source, sourcePath, contractName) {
  if (binary == null) {
    throw new Error("Can't create context without binary!");
  }

  this.binary = binary;
  this.sourceMap = sourceMap;
  this.source = source;
  this.sourcePath = sourcePath;
  this.contractName = contractName || "?";
  this.programCounterMapping = [];
  this.instructions = [];

  this.buildInstructionList()
};

Context.prototype.buildInstructionList = function() {
  var self = this;

  this.instructions = CodeUtils.parseCode(this.binary);

  var sourceMap = this.sourceMap;

  if (!sourceMap) {
    var sourceMap = "";

    // Let's create a source map to use since none exists. This source map
    // maps just as many ranges as there are instructions, and ensures every
    // instruction is marked as "jumping out". This will ensure all
    // available debugger commands step one instruction at a time.
    //
    // This is kindof a hack; perhaps this should be broken out into separate
    // context types. TODO
    for (var i = 0; i < this.instructions.length; i++) {
      sourceMap += i + ":" + i + ":1:o;";
    }
  }

  var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(this.source || "");
  var humanReadableSourceMap = SolidityUtils.getHumanReadableSourceMap(sourceMap);

  this.instructions.forEach(function(instruction, instructionIndex) {
    var sourceMapInstruction = humanReadableSourceMap[instructionIndex];

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
    self.programCounterMapping[instruction.pc] = instruction;
  });
};

Context.prototype.instructionAtProgramCounter = function(programCounter) {
  return this.programCounterMapping[programCounter];
};

module.exports = Context;
