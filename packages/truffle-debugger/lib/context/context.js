import debugModule from "debug";

import SolidityUtils from "truffle-solidity-utils";
import CodeUtils from "truffle-code-utils";

const debug = debugModule("debugger:context");

/**
 * Scope
 * @constructor
 */
export default class Context {
  constructor(binary, options) {
    if (binary == null) {
      throw new Error("Can't create context without binary!");
    }

    this.binary = binary;

    if (options.addresses) {
      this.addresses = options.addresses;
    } else if (options.address) {
      this.addresses = new Set([options.address]);
    } else {
      this.addresses = new Set();
    }

    debug("options: %o", options);
    this.sourceMap = options.sourceMap;
    this.source = options.source;
    this.sourcePath = options.sourcePath;
    this.contractName = options.contractName || "?";

    this.instructions = Context.getInstructions(this.binary, this.source, this.sourceMap);

    this.programCounterMapping = Context.getProgramCounterMapping(this.instructions);
    debug("programCounterMapping: %o", this.programCounterMapping);
  }

  merge(other) {
    let binary = this.binary;

    let addresses = new Set([...this.addresses, ...other.addresses]);
    let sourceMap = this.sourceMap || other.sourceMap;
    let source = this.source || other.source;
    let sourcePath = this.sourcePath || other.sourcePath;
    let contractName = this.contractName || other.contractName;

    return new Context(binary, {
      addresses,
      sourceMap,
      source,
      sourcePath,
      contractName
    });
  }

  static getInstructions(binary, source, sourceMap) {
    // raw bytecode instructions
    var instructions = CodeUtils.parseCode(binary);

    var sourceMap = sourceMap;

    if (!sourceMap) {
      debug("no sourcemap");
      sourceMap = "";

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
    }

    var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(source || "");
    var humanReadableSourceMap = SolidityUtils.getHumanReadableSourceMap(sourceMap);

    instructions.forEach(function(instruction, instructionIndex) {
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
    });

    return instructions;
  }

  /**
   * Returns array, mapping PC index -> Instruction index
   */
  static getProgramCounterMapping(instructions) {
    var map = [];
    instructions.forEach(function(instruction) {
      map[instruction.pc] = instruction.index;
    });

    return map;
  }

  instructionAtProgramCounter(programCounter) {
    debug("programCounter: %O", programCounter);
    debug("instructionIndex: %O", this.programCounterMapping[programCounter]);
    return this.instructions[this.programCounterMapping[programCounter]];
  }
}
