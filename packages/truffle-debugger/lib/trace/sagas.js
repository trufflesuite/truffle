import debugModule from "debug";
const debug = debugModule("debugger:trace:sagas");

import { call, fork, take, takeLatest, put } from "redux-saga/effects";
import { view } from "../effects";

import * as actions from "./actions";
import trace from "./selectors";

export function* next() {
  let remaining = yield view(trace.stepsRemaining);
  debug("remaining: %o", remaining);

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
  yield takeLatest(actions.NEXT, next);
}
