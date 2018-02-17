import debugModule from "debug";
const debug = debugModule("debugger:solidity:selectors");

import { createSelectorTree, createLeaf } from "../selectors";
import SolidityUtils from "truffle-solidity-utils";
import CodeUtils from "truffle-code-utils";

import context from "../context/selectors";
import evm from "../evm/selectors";

let selector = createSelectorTree({
  /**
   * solidity.currentState
   */
  currentState: {
    /**
     * solidity.currentState.functionDepth
     */
    functionDepth: (state) => state.solidity.functionDepth,

    /**
     * solidity.currentState.instructions
     */
    instructions: createLeaf(
      [context.current], (context) => {
        debug("context: %o", context);
        let instructions = CodeUtils.parseCode(context.binary);

        let sourceMap = context.sourceMap;
        if (!sourceMap) {
          // Let's create a source map to use since none exists. This source map
          // maps just as many ranges as there are instructions, and ensures every
          // instruction is marked as "jumping out". This will ensure all
          // available debugger commands step one instruction at a time.
          //
          // This is kindof a hack; perhaps this should be broken out into separate
          // context types. TODO
          sourceMap = "";
          for (var i = 0; i < instructions.length; i++) {
            sourceMap += i + ":" + i + ":1:o;";
          }
        }

        var lineAndColumnMapping = SolidityUtils.getCharacterOffsetToLineAndColumnMapping(context.source || "");
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
        debug("instructions: %O", instructions.filter((i) => i.jump != "-"));

        return instructions;
      }
    ),

    /**
     * solidity.currentState.instructionAtProgramCounter
     */
    instructionAtProgramCounter: createLeaf(
      ["./instructions"],

      (instructions) => {
        let map = [];
        instructions.forEach(function(instruction) {
          map[instruction.pc] = instruction;
        });
        return map;
      }
    )
  },

  /**
   * solidity.nextStep
   */
  nextStep: {
    /**
     * solidity.nextStep.nextInstruction
     */
    nextInstruction: createLeaf(
      ["../currentState/instructionAtProgramCounter", evm.nextStep.programCounter],

      (map, pc) => map[pc]
    ),

    /**
     * solidity.nextStep.sourceRange
     */
    sourceRange: createLeaf(
      ["./nextInstruction"],

      (instruction) => {
        return {
          start: instruction.start,
          length: instruction.length,
          lines: instruction.range
        };
      }
    ),

    /**
     * solidity.nextStep.isMultiline
     */
    isMultiline: createLeaf(
      ["./sourceRange"],

      ( {lines} ) => lines.start.line != lines.end.line
    ),

    /**
     * solidity.nextStep.jumpDirection
     */
    jumpDirection: createLeaf(["./nextInstruction"], (i) => i.jump)
  }
});

export default selector;
