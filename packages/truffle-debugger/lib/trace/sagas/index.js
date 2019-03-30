import debugModule from "debug";
const debug = debugModule("debugger:trace:sagas");

import { take, takeEvery, put, select } from "redux-saga/effects";
import { prefixName, isCallMnemonic, isCreateMnemonic } from "lib/helpers";

import * as DecodeUtils from "truffle-decode-utils";

import * as actions from "../actions";

import trace from "../selectors";

function* waitForTrace() {
  let { steps } = yield take(actions.SAVE_STEPS);

  let addresses = [
    ...new Set(
      steps
        .map(({ op, stack, depth }, index) => {
          if (isCallMnemonic(op)) {
            //if it's a call, just fetch the address off the stack
            return DecodeUtils.Conversion.toAddress(stack[stack.length - 2]);
          } else if (isCreateMnemonic(op)) {
            //if it's a create, look ahead to when it returns and get the
            //address off the stack
            let returnStack = steps
              .slice(index + 1)
              .find(step => step.depth === depth).stack;
            return DecodeUtils.Conversion.toAddress(
              returnStack[returnStack.length - 1]
            );
          } else {
            //if it's not a call or create, there's no address to get
            return undefined;
          }
        })
        //filter out zero addresses from failed creates (as well as undefineds)
        .filter(
          address =>
            address !== undefined && address !== DecodeUtils.EVM.ZERO_ADDRESS
        )
    )
  ];

  yield put(actions.receiveAddresses(addresses));
}

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

    //wait for all subtocks before continuing
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
  yield put(actions.subtock());
}

export function* processTrace(trace) {
  yield put(actions.saveSteps(trace));

  let { addresses } = yield take(actions.RECEIVE_ADDRESSES);
  debug("received addresses");

  return addresses;
}

export function* reset() {
  yield put(actions.reset());
}

export function* saga() {
  // wait for trace to be defined
  yield* waitForTrace();

  yield takeEvery(actions.NEXT, next);
}

export default prefixName("trace", saga);
