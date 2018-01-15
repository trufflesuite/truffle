import { createSelector, createStructuredSelector } from "reselect";

import context from "../context/selectors";
import evm from "../evm/selectors";

const functionDepth = (state, props) => state.solidity.functionDepth;

let currentState = createStructuredSelector({
  functionDepth
});
currentState.functionDepth = functionDepth;

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

let nextStep = createStructuredSelector({
  nextInstruction: nextInstruction,
  sourceRange: sourceRange,
  isMultiline: isMultiline,
  jumpDirection: jumpDirection,
});

nextStep.nextInstruction = nextInstruction;
nextStep.sourceRange = sourceRange;
nextStep.isMultiline = isMultiline;
nextStep.jumpDirection = jumpDirection;

let selector = createStructuredSelector({
  currentState,
  nextStep
});
selector.currentState = currentState;
selector.nextStep = nextStep;

export default selector;
