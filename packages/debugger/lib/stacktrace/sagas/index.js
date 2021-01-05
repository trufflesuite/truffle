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

//NOTE: we deliberately *don't* do any phantom-checking in this
//submodule.  yes, it will result in some junk stackframes, but
//I really don't want a fallback or constructor frame skipped over
//due to phantom checking

function* stacktraceSaga() {
  const currentLocation = yield select(stacktrace.current.strippedLocation);
  const lastLocation = yield select(stacktrace.current.lastPosition);
  const returnCounter = yield select(stacktrace.current.returnCounter);
  let positionUpdated = false;
  //different possible outcomes:
  //first: are we returning?
  if (yield select(stacktrace.current.willReturn)) {
    const status = yield select(stacktrace.current.returnStatus);
    debug("returning!");
    yield put(actions.externalReturn(lastLocation, status, currentLocation));
    positionUpdated = true;
  } else if (
    //next: are we *executing* a return?
    //note this needs to be an else if or else this could execute
    //in an inconsistent state
    returnCounter > 0 &&
    (yield select(stacktrace.current.positionWillChange))
  ) {
    debug("executing!");
    debug("location: %o", yield select(stacktrace.next.location));
    debug("marked: %o", lastLocation);
    yield put(actions.executeReturn(returnCounter, currentLocation));
    positionUpdated = true;
  }
  //we now process the other possibilities.
  //technically, an EXECUTE_RETURN could happen as well as those below,
  //resulting in 2 actions instead of just one, but it's pretty unlikely.
  //(an EXTERNAL_RETURN, OTOH, is obviously exclusive of the possibilities below)
  if ((yield select(stacktrace.current.willJumpIn)) && returnCounter === 0) {
    //note: do NOT process jumps while there are returns waiting to execute
    const nextLocation = yield select(stacktrace.next.location);
    const nextParent = yield select(stacktrace.next.contractNode);
    yield put(actions.jumpIn(currentLocation, nextLocation.node, nextParent));
    positionUpdated = true;
  } else if (
    (yield select(stacktrace.current.willJumpOut)) &&
    returnCounter === 0
  ) {
    //again, do not process jumps while there are returns waiting to execute
    yield put(actions.jumpOut(currentLocation));
    positionUpdated = true;
  } else if (yield select(stacktrace.current.willCall)) {
    //note: includes creations
    //note: does *not* include calls that insta-return.  logically speaking,
    //such calls should be a call + a return in one, right? and we could do that,
    //making a call while also incrementing the return counter.  but the stacktraces
    //this would generate would, I think, be more confusing than helpful, so I'm
    //deliberately not doing that.
    //NOTE: we can't use stacktrace.next.location here as that
    //doesn't work across call contexts!
    const nextContext = yield select(stacktrace.current.callContext);
    const nextAddress = yield select(stacktrace.current.callAddress);
    yield put(actions.externalCall(currentLocation, nextContext, nextAddress));
    positionUpdated = true;
  }
  //finally, if no other action updated the position, do so here
  if (!positionUpdated) {
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
  const context = yield select(stacktrace.current.context);
  const address = yield select(stacktrace.current.address);
  yield put(actions.externalCall(null, context, address));
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("stacktrace", saga);
