import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";
import * as trace from "lib/trace/sagas";

import solidity from "../selectors";

export function* addSources(sources) {
  yield put(actions.addSources(sources));
}

function* tickSaga() {
  debug("got TICK");

  yield* functionDepthSaga();
  debug("instruction: %O", yield select(solidity.current.instruction));
  yield* trace.signalTickSagaCompletion();
}

function* functionDepthSaga() {
  if (yield select(solidity.current.willReturn)) {
    //we do this case first so we can be sure we're not failing in any of the
    //other cases below!
    yield put(actions.externalReturn());
  } else if (yield select(solidity.current.willJump)) {
    let jumpDirection = yield select(solidity.current.jumpDirection);
    debug("checking guard");
    let guard = yield select(solidity.current.nextFrameIsPhantom);
    let nextSource = yield select(solidity.next.source);
    if (jumpDirection === "i" && guard && nextSource.id !== undefined) {
      yield put(actions.clearPhantomGuard());
    } else {
      yield put(actions.jump(jumpDirection));
    }
  } else if (yield select(solidity.current.willCall)) {
    //note: includes creations; does not include insta-returns
    debug("checking if guard needed");
    let guard = yield select(solidity.current.callRequiresPhantomFrame);
    yield put(actions.externalCall(guard));
  }
}

export function* reset() {
  let guard = yield select(
    solidity.transaction.bottomStackframeRequiresPhantomFrame
  );
  yield put(actions.reset(guard));
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* begin() {
  let guard = yield select(
    solidity.transaction.bottomStackframeRequiresPhantomFrame
  );
  yield put(actions.externalCall(guard));
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("solidity", saga);
