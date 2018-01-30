import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

import trace from "../trace/selectors";

const callstack = (state) => state.evm.callstack;

const currentCall = createSelector(
  [callstack],

  (stack) => stack.length ? stack[stack.length - 1] : {}
)

let currentState = createNestedSelector({
  call: currentCall,
  callstack: callstack
});


const programCounter = createSelector(
  [trace.step],

  (step) => step.pc
);

const isJump = createSelector(
  [trace.step],

  (step) => step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
);

const isCall = createSelector(
  [trace.step],

  (step) => step.op == "CALL" || step.op == "DELEGATECALL"
);

const isCreate = createSelector(
  [trace.step],

  (step) => step.op == "CREATE"
);

const isHalting = createSelector(
  [trace.step],

  (step) => step.op == "STOP" || step.op == "RETURN"
);

const callAddress = createSelector(
  [isCall, trace.step],

  (matches, step) => {
    if (!matches) return null;

    let address = step.stack[step.stack.length - 2]
    address = "0x" + address.substring(24);
    return address;
  }
);

const createBinary = createSelector(
  [isCreate, trace.step],

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


let nextStep = createNestedSelector({
  programCounter,

  isJump,
  isCall,
  isCreate,
  isHalting,

  callAddress,
  createBinary
});

let selector = createNestedSelector({
  current: currentState,
  nextStep
});

export default selector;
