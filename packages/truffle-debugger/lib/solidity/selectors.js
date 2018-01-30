import debugModule from "debug";
const debug = debugModule("debugger:solidity:selectors");

import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";
import SolidityUtils from "truffle-solidity-utils";
import CodeUtils from "truffle-code-utils";

import context from "../context/selectors";
import evm from "../evm/selectors";

const functionDepth = (state, props) => state.solidity.functionDepth;

let currentState = createNestedSelector({
  functionDepth
});

const instructions = createSelector(
  [context.current],

  (context) => {
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
);

const instructionAtProgramCounter = createSelector(
  [instructions],

  (instructions) => {
    let map = [];
    instructions.forEach(function(instruction) {
      map[instruction.pc] = instruction;
    });
    return map;
  }
);

const nextInstruction = createSelector(
  [instructionAtProgramCounter, evm.nextStep.programCounter],

  (map, pc) => map[pc]
);

const sourceRange = createSelector(
  [nextInstruction],

  (instruction) => {
    return {
      start: instruction.start,
      length: instruction.length,
      lines: instruction.range
    };
  }
);

const isMultiline = createSelector(
  [sourceRange],

  ( {lines} ) => lines.start.line != lines.end.line
);


const jumpDirection = createSelector(
  [nextInstruction],

  (instruction) => instruction.jump
);

let nextStep = createNestedSelector({
  nextInstruction: nextInstruction,
  sourceRange: sourceRange,
  isMultiline: isMultiline,
  jumpDirection: jumpDirection,
});

let selector = createNestedSelector({
  currentState,
  nextStep
});

export default selector;
