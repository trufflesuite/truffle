import debugModule from "debug";
const debug = debugModule("debugger:trace:sagas");

import { take, takeEvery, put, select } from "redux-saga/effects";
import { prefixName, isCallMnemonic } from "lib/helpers";

import * as DecodeUtils from "truffle-decode-utils";

import * as actions from "../actions";

import trace from "../selectors";

export function* advance() {
  yield put(actions.next());

  debug("TOCK to take");
  yield take([actions.TOCK, actions.END_OF_TRACE]);
  debug("TOCK taken");
}

const SUBMODULE_COUNT = 3; //data, evm, solidity

function* next() {
  let remaining = yield select(trace.stepsRemaining);
  debug("remaining: %o", remaining);
  let steps = yield select(trace.steps);
  debug("total steps: %o", steps.length);
  let waitingForSubmodules = 0;

  if (remaining > 0) {
    debug("putting TICK");
    // updates state for current step
    waitingForSubmodules = SUBMODULE_COUNT;
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

  let addresses = [
    ...new Set(
      steps
        .map(
          ({ op, stack }) =>
            isCallMnemonic(op)
              ? //if it's a call, just fetch the address off the stack
                DecodeUtils.Conversion.toAddress(stack[stack.length - 2])
              : //if it's not a call, just return undefined (we've gone back to
                //skipping creates)
                undefined
        )
        //filter out zero addresses from failed creates (as well as undefineds)
        .filter(
          address =>
            address !== undefined && address !== DecodeUtils.EVM.ZERO_ADDRESS
        )
    )
  ];

  return addresses;
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
