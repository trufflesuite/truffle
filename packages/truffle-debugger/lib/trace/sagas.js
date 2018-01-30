import debugModule from "debug";
const debug = debugModule("debugger:trace:sagas");

import { take, takeLatest, put, select } from "redux-saga/effects";

import * as actions from "./actions";
import trace from "./selectors";

export function* next() {
  let remaining = yield select(trace.stepsRemaining);
  debug("remaining: %o", remaining);
  let steps = yield select(trace.steps);
  debug("total steps: %o", steps.length);

  if (remaining > 0) {
    debug("putting TICK");
    // updates state for current step
    yield put(actions.tick());
    debug("put TICK");

    remaining--; // local update, just for convenience
  }

  if (remaining) {
    debug("putting TOCK");
    // updates step to next step in trace
    yield put(actions.tock());
    debug("put TOCK");

  } else {

    yield put(actions.endTrace());
  }
}

export default function* saga() {
  // wait for trace to be defined
  yield take(actions.SAVE_STEPS);

  yield takeLatest(actions.NEXT, next);
}
