import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";
import * as trace from "lib/trace/sagas";

import stacktrace from "../selectors";

function* tickSaga() {
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
  let returnedRightNow = false;
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
    debug("returning!");
    yield put(actions.externalReturn(currentLocation, status));
    returnedRightNow = true;
  }
  //the following checks are separate and happen even if one of the above
  //branches was taken (so, we may have up to 3 actions, sorry)
  //(note that shouldn't actually happen, realistically you'll only have 1,
  //but notionally it could be up to 3)
  if (!returnedRightNow && (yield select(stacktrace.current.justReturned))) {
    debug("location: %o", currentLocation);
    if (currentLocation.source.id !== undefined) {
      //if we're in unmapped code, don't mark yet
      yield put(actions.markReturnPosition(currentLocation));
    }
  }
  if (yield select(stacktrace.current.positionWillChange)) {
    debug("executing!");
    debug("location: %o", yield select(stacktrace.next.location));
    debug("marked: %o", yield select(stacktrace.current.markedPosition));
    const returnCounter = yield select(stacktrace.current.returnCounter);
    yield put(actions.executeReturn(returnCounter));
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
