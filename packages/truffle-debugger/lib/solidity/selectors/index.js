import debugModule from "debug";
const debug = debugModule("debugger:solidity:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import SolidityUtils from "truffle-solidity-utils";
import CodeUtils from "truffle-code-utils";

import evm from "lib/evm/selectors";

function getSourceRange(instruction = {}) {
  return {
    start: instruction.start || 0,
    length: instruction.length || 0,
    lines: instruction.range || {
      start: {
        line: 0, column: 0
      },
      end: {
        line: 0, column: 0
      }
    }
  };
}

let solidity = createSelectorTree({
  /**
   * solidity.state
   */
  state: (state) => state.solidity,

  /**
   * solidity.info
   */
  info: {
    /**
     * solidity.info.sources
     */
    sources: createLeaf(['/state'], (state) => state.info.sources.byId),

    /**
     * solidity.info.sourceMaps
     */
    sourceMaps: createLeaf(['/state'], (state) => state.info.sourceMaps.byContext)
  },

  /**
   * solidity.current
   */
  current: {

    /**
     * solidity.current.sourceMap
     */
    sourceMap: createLeaf(
      [evm.current.context, "/info/sourceMaps"],

      ({context}, sourceMaps) => sourceMaps[context]
    ),

    /**
     * solidity.current.functionDepth
     */
    functionDepth: (state) => state.solidity.proc.functionDepth,

    /**
     * solidity.current.instructions
     */
    instructions: createLeaf(
      ["/info/sources", evm.current.context, "./sourceMap"],

      (sources, {binary}, {sourceMap}) => {
        let instructions = CodeUtils.parseCode(binary);

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

        var lineAndColumnMappings = Object.assign({},
          ...Object.entries(sources).map(
            ([id, {source}]) => ({
              [id]: SolidityUtils.getCharacterOffsetToLineAndColumnMapping(source || "")
            })
          )
        );
        var humanReadableSourceMap = SolidityUtils.getHumanReadableSourceMap(sourceMap);

        instructions.forEach(function(instruction, instructionIndex) {
          var sourceMapInstruction = humanReadableSourceMap[instructionIndex];

          instruction.index = instructionIndex;

          if (sourceMapInstruction) {
            var lineAndColumnMapping = lineAndColumnMappings[sourceMapInstruction.file];

            instruction.jump = sourceMapInstruction.jump;
            instruction.start = sourceMapInstruction.start;
            instruction.length = sourceMapInstruction.length;
            instruction.file = sourceMapInstruction.file;
            instruction.range = {
              start: lineAndColumnMapping[sourceMapInstruction.start],
              end: lineAndColumnMapping[sourceMapInstruction.start + sourceMapInstruction.length]
            }
          }
        });

        return instructions;
      }
    ),

    /**
     * solidity.current.instructionAtProgramCounter
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
   * solidity.next
   */
  next: {

    /**
     * solidity.next.instruction
     */
    instruction: createLeaf(
      ["../current/instructionAtProgramCounter", evm.next.step.programCounter],

      (map, pc) => map[pc]
    ),

    /**
     * solidity.next.source
     */
    source: createLeaf(
      ["/info/sources", "./instruction"],

      (sources, {file: id}) => sources[id]
    ),

    /**
     * solidity.next.sourceRange
     */
    sourceRange: createLeaf(["./instruction"], getSourceRange),

    /**
     * solidity.next.isMultiline
     */
    isMultiline: createLeaf(
      ["./sourceRange"],

      ( {lines} ) => lines.start.line != lines.end.line
    ),

    /**
     * solidity.next.willJump
     */
    willJump: createLeaf([evm.next.step.isJump], (isJump) => isJump),

    /**
     * solidity.next.jumpDirection
     */
    jumpDirection: createLeaf(
      ["./instruction"], (i = {}) => (i.jump || "-")
    )
  }
});

export default solidity;
