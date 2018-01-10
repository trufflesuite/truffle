import { createSelector, createStructuredSelector } from "reselect";

import evm from "../evm/selectors";

import currentContext from "./currentContext";
import currentState from "./currentState";

const programCounter = createSelector(
  [currentState.trace.step],
  (step) => step.pc
);

const nextInstruction = createSelector(
  [currentContext, programCounter],

  (context, pc) => context.instructionAtProgramCounter(pc)
);

const soliditySourceRange = createSelector(
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
  [soliditySourceRange],

  ( {lines} ) => lines.start.line != lines.end.line
);

const jumpDirection = createSelector(
  [nextInstruction],

  (instruction) => instruction.jump
);

let solidity = createStructuredSelector({
  nextInstruction: nextInstruction,
  sourceRange: soliditySourceRange,
  isMultiline: isMultiline,
  jumpDirection: jumpDirection,
});

solidity.nextInstruction = nextInstruction;
solidity.sourceRange = soliditySourceRange;
solidity.isMultiline = isMultiline;
solidity.jumpDirection = jumpDirection;

let nextStep = createStructuredSelector({
  evm: evm.nextStep,
  solidity: solidity
});
nextStep.evm = evm.nextStep;
nextStep.solidity = solidity;

export default nextStep;
