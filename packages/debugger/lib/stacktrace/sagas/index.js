import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";
import * as trace from "lib/trace/sagas";

import stacktrace from "../selectors";

function* tickSaga() {
  debug("got TICK");

  yield* stacktraceSaga();
  yield* trace.signalTickSagaCompletion();
}

function* stacktraceSaga() {
  //different possible outcomes:
  const {
    source: { id, compilationId, sourcePath },
    sourceRange
  } = yield select(stacktrace.current.location);
  const source = { id, compilationId, sourcePath }; //leave out everything else
  const currentLocation = { source, sourceRange }; //leave out the node
  if (yield select(stacktrace.current.willJumpIn)) {
    const nextLocation = yield select(stacktrace.next.location);
    yield put(actions.jumpIn(currentLocation, nextLocation.node)); //in this case we only want the node
  } else if (yield select(stacktrace.current.willJumpOut)) {
    yield put(actions.jumpOut());
  } else if (yield select(stacktrace.current.willCall)) {
    //an external frame marked "skip in reports" will be, for reporting
    //purposes, combined with the frame above, unless that also is a
    //marker frame (combined in the appropriate sense)
    //note: includes creations
    const skipInReports = yield select(
      stacktrace.current.nextFrameIsSkippedInReports
    );
    yield put(actions.externalCall(currentLocation, skipInReports));
  } else if (yield select(stacktrace.current.willReturn)) {
    const status = yield select(stacktrace.current.returnStatus);
    yield put(actions.externalReturn(currentLocation, status));
  } else if (yield select(stacktrace.current.positionChanged)) {
    const returnCounter = yield select(stacktrace.current.returnCounter);
    yield put(actions.executeReturn(returnCounter));
  } else if (yield select(stacktrace.current.justReturned)) {
    yield put(actions.markReturnPosition(currentLocation));
  } else {
    yield put(actions.clearReturnMarker());
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* begin() {
  const skipInReports = yield select(
    stacktrace.current.nextFrameIsSkippedInReports
  );
  yield put(actions.externalCall(null, skipInReports));
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("stacktrace", saga);
