import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

import context from "../context/selectors";
import evm from "../evm/selectors";

const functionDepth = (state, props) => state.solidity.functionDepth;

let currentState = createNestedSelector({
  functionDepth
});

const nextInstruction = createSelector(
  [context.current, evm.nextStep.programCounter],

  (context, pc) => context.instructionAtProgramCounter(pc)
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
