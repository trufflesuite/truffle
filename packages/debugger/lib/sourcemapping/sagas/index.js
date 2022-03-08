import debugModule from "debug";
const debug = debugModule("debugger:sourcemapping:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";
import * as trace from "lib/trace/sagas";

import sourcemapping from "../selectors";

export function* addSources(sources) {
  yield put(actions.addSources(sources));
}

function* tickSaga() {
  debug("got TICK");

  yield* functionDepthSaga();
  debug("instruction: %O", yield select(sourcemapping.current.instruction));
  yield* trace.signalTickSagaCompletion();
}

function* functionDepthSaga() {
  if (yield select(sourcemapping.current.willReturn)) {
    //we do this case first so we can be sure we're not failing in any of the
    //other cases below!
    yield put(actions.externalReturn());
  } else if (yield select(sourcemapping.current.willJump)) {
    let jumpDirection = yield select(sourcemapping.current.jumpDirection);
    debug("checking guard");
    let guard = yield select(sourcemapping.current.nextFrameIsPhantom);
    let nextSource = yield select(sourcemapping.next.source);
    if (
      jumpDirection === "i" &&
      guard &&
      nextSource.id !== undefined &&
      !nextSource.internal
    ) {
      //note that we don't want jumps into unmapped code or internal sources to clear
      //the phantom guard; those will just be counted like normal
      yield put(actions.clearPhantomGuard());
    } else {
      yield put(actions.jump(jumpDirection));
    }
  } else if (yield select(sourcemapping.current.willCall)) {
    //note: includes creations; does not include insta-returns
    debug("checking if guard needed");
    let guard = yield select(sourcemapping.current.callRequiresPhantomFrame);
    yield put(actions.externalCall(guard));
  }
}

export function* reset() {
  let guard = yield select(
    sourcemapping.transaction.bottomStackframeRequiresPhantomFrame
  );
  yield put(actions.reset(guard));
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* begin() {
  let guard = yield select(
    sourcemapping.transaction.bottomStackframeRequiresPhantomFrame
  );
  yield put(actions.externalCall(guard));
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("sourcemapping", saga);
