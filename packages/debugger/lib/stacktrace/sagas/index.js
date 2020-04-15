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
  const lastLocation = yield select(stacktrace.current.lastPosition); //get this upfront due to sequencing issues
  let returnedRightNow = false;
  let positionUpdated = false;
  if (yield select(stacktrace.current.willJumpIn)) {
    const nextLocation = yield select(stacktrace.next.location);
    yield put(actions.jumpIn(currentLocation, nextLocation.node)); //in this case we only want the node
    positionUpdated = true;
  } else if (yield select(stacktrace.current.willJumpOut)) {
    yield put(actions.jumpOut(currentLocation));
    positionUpdated = true;
  } else if (yield select(stacktrace.current.willCall)) {
    //an external frame marked "skip in reports" will be, for reporting
    //purposes, combined with the frame above, unless that also is a
    //marker frame (combined in the appropriate sense)
    //note: includes creations
    const skipInReports = yield select(
      stacktrace.current.nextFrameIsSkippedInReports
    );
    yield put(actions.externalCall(currentLocation, skipInReports));
    positionUpdated = true;
  } else if (yield select(stacktrace.current.willReturnOrFail)) {
    const status = yield select(stacktrace.current.returnStatus);
    debug("returning!");
    yield put(actions.externalReturn(lastLocation, status, currentLocation));
    returnedRightNow = true;
    positionUpdated = true;
  }
  //we'll handle this next case separately of the above,
  //so notionally 2 actions could fire, but it's pretty unlikely
  if (
    !returnedRightNow && //otherwise this will trigger in an inconsistent state
    (yield select(stacktrace.current.returnCounter)) > 0 &&
    (yield select(stacktrace.current.positionWillChange))
  ) {
    debug("executing!");
    debug("location: %o", yield select(stacktrace.next.location));
    debug("marked: %o", yield select(stacktrace.current.lastPosition));
    const returnCounter = yield select(stacktrace.current.returnCounter);
    yield put(actions.executeReturn(returnCounter, currentLocation));
    positionUpdated = true;
  }
  if (!positionUpdated) {
    //finally, if no other action updated the position, do so here
    yield put(actions.updatePosition(currentLocation));
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
