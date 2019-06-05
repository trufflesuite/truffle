import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";
import * as trace from "lib/trace/sagas";

import solidity from "../selectors";

export function* addSource(source, sourcePath, ast, compiler) {
  yield put(actions.addSource(source, sourcePath, ast, compiler));
}

function* tickSaga() {
  debug("got TICK");

  yield* functionDepthSaga();
  debug("instruction: %O", yield select(solidity.current.instruction));
  yield* trace.signalTickSagaCompletion();
}

function* functionDepthSaga() {
  if (yield select(solidity.current.willFail)) {
    //we do this case first so we can be sure we're not failing in any of the
    //other cases below!
    yield put(actions.externalReturn());
  } else if (yield select(solidity.current.willJump)) {
    let jumpDirection = yield select(solidity.current.jumpDirection);
    yield put(actions.jump(jumpDirection));
  } else if (yield select(solidity.current.willCall)) {
    debug("about to call");
    if (yield select(solidity.current.callsPrecompileOrExternal)) {
      //call to precompile or externally-owned account; do nothing
    } else {
      yield put(actions.externalCall());
    }
  } else if (yield select(solidity.current.willCreate)) {
    yield put(actions.externalCall());
  } else if (yield select(solidity.current.willReturn)) {
    yield put(actions.externalReturn());
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("solidity", saga);
