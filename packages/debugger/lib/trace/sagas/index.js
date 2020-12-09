import debugModule from "debug";
const debug = debugModule("debugger:trace:sagas");

import {take, takeEvery, put, select} from "redux-saga/effects";
import {
  prefixName,
  isCallMnemonic,
  isCreateMnemonic,
  isSelfDestructMnemonic
} from "lib/helpers";

import * as Codec from "@truffle/codec";

import * as actions from "../actions";

import trace from "../selectors";

export function* setSubmoduleCount(count) {
  yield put(actions.setSubmoduleCount(count));
}

export function* addSubmoduleToCount(increment = 1) {
  let count = yield select(trace.application.submoduleCount);
  yield put(actions.setSubmoduleCount(count + increment));
}

export function* advance() {
  yield put(actions.next());

  debug("TOCK to take");
  yield take([actions.TOCK, actions.END_OF_TRACE]);
  debug("TOCK taken");
}

function* next() {
  let remaining = yield select(trace.stepsRemaining);
  debug("remaining: %o", remaining);
  let steps = yield select(trace.steps);
  debug("total steps: %o", steps.length);
  let waitingForSubmodules = 0;

  if (remaining > 0) {
    debug("putting TICK");
    // updates state for current step
    waitingForSubmodules = yield select(trace.application.submoduleCount);
    yield put(actions.tick());
    debug("put TICK");

    //wait for all backticks before continuing
    while (waitingForSubmodules > 0) {
      yield take(actions.BACKTICK);
      debug("got BACKTICK");
      waitingForSubmodules--;
    }

    remaining--; // local update, just for convenience
  }

  if (remaining) {
    debug("putting TOCK");
    // updates step to next step in trace
    yield put(actions.tock());
    debug("put TOCK");
  } else {
    debug("putting END_OF_TRACE");
    yield put(actions.endTrace());
    debug("put END_OF_TRACE");
  }
}

export function* signalTickSagaCompletion() {
  yield put(actions.backtick());
}

export function* processTrace(steps) {
  yield put(actions.saveSteps(steps));

  let callAddresses = new Set();
  let selfDestructAddresses = new Set();
  let createdBinaries = {};

  for (let index = 0; index < steps.length; index++) {
    const {op, depth, stack, memory} = steps[index];
    if (isCallMnemonic(op)) {
      callAddresses.add(Codec.Evm.Utils.toAddress(stack[stack.length - 2]));
    } else if (isCreateMnemonic(op)) {
      const returnStep = steps
        .slice(index + 1)
        .find(step => step.depth === depth);
      if (returnStep) {
        const returnStack = returnStep.stack;
        const address = Codec.Evm.Utils.toAddress(
          returnStack[returnStack.length - 1]
        );
        if (address !== Codec.Evm.Utils.ZERO_ADDRESS) {
          //now: extract the created binary.
          //note we multiply by 2 because we're dealing with hex strings.
          const offset = parseInt(stack[stack.length - 2], 16) * 2;
          const length = parseInt(stack[stack.length - 3], 16) * 2;
          const binary =
            "0x" +
            memory
              .join("")
              .substring(offset, offset + length)
              .padEnd(length, "00");
          createdBinaries[address] = binary;
          //warning: this is a deliberately crude method!
          //it may warrant replacement later.
          //(but it should be good enough for most purposes)
        }
      }
    } else if (isSelfDestructMnemonic(op)) {
      selfDestructAddresses.add(
        Codec.Evm.Utils.toAddress(stack[stack.length - 1])
      );
    }
  }

  return {
    calls: [...callAddresses],
    selfdestructs: [...selfDestructAddresses],
    creations: createdBinaries
  };
}

export function* reset() {
  yield put(actions.reset());
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* saga() {
  yield takeEvery(actions.NEXT, next);
}

export default prefixName("trace", saga);
