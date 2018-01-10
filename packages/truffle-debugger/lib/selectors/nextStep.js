import { createSelector, createStructuredSelector } from "reselect";

import currentContext from "./currentContext";
import { traceStep } from "./currentState";

const isJump = createSelector(
  [traceStep],

  (step) => step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
);

const isCall = createSelector(
  [traceStep],

  (step) => step.op == "CALL" || step.op == "DELEGATECALL"
);

const isCreate = createSelector(
  [traceStep],

  (step) => step.op == "CREATE"
);

const isHalting = createSelector(
  [traceStep],

  (step) => step.op == "STOP" || step.op == "RETURN"
);

const callAddress = createSelector(
  [isCall, traceStep],

  (matches, step) => {
    if (!matches) return null;

    let address = step.stack[step.stack.length - 2]
    address = "0x" + address.substring(24);
    return address;
  }
);

const createBinary = createSelector(
  [isCreate, traceStep],

  (matches, step) => {
    if (!matches) return null;

    const memory = step.memory.join("");

    // Get the code that's going to be created from memory.
    // Note we multiply by 2 because these offsets are in bytes.
    const inputOffset = parseInt(step.stack[step.stack.length - 2], 16) * 2;
    const inputSize = parseInt(step.stack[step.stack.length - 3], 16) * 2;

    return "0x" + memory.substring(inputOffset, inputOffset + inputSize);
  }
);

let evm = createStructuredSelector({
  isJump,
  isCall,
  isCreate,
  isHalting,

  callAddress,
  createBinary
});
evm.isJump = isJump;
evm.isCall = isCall;
evm.isCreate = isCreate;
evm.isHalting = isHalting;
evm.callAddress = callAddress;
evm.createBinary = createBinary;

const programCounter = createSelector(
  [traceStep],
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
  evm: evm,
  solidity: solidity
});

nextStep.evm = evm;
nextStep.solidity = solidity;

export default nextStep;
