import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { call, put, take, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";

import solidity from "../selectors";

export function* addSource(source, sourcePath, ast) {
  yield put(actions.addSource(source, sourcePath, ast));
}

export function* addSourceMap(binary, sourceMap) {
  yield put(actions.addSourceMap(binary, sourceMap));
}

function* tickSaga() {
  while (true) {
    yield take(TICK);
    debug("got TICK");

    yield* functionDepthSaga();
  }
}

function* functionDepthSaga() {
  if (yield select(solidity.current.willJump)) {
    let jumpDirection = yield select(solidity.current.jumpDirection);

    yield put(actions.jump(jumpDirection));
  } else if (yield select(solidity.current.willCall)) {
    debug("about to call");
    //HACK WORKAROUND
    //because of the solc problem where contract method calls essentially
    //return twice, we compensate by putting *two* inward jumps for such a
    //call.  Note that this won't work if the contract method was previously
    //placed in a function variable!  Those will continue to screw things up!
    //But if a contract call is being made directly, we can detect that.
    if (yield select(solidity.current.isContractCall)) {
      debug("workaround invoked!");
      yield put(actions.jump("2"));
    } else {
      yield put(actions.jump("i"));
    }
  } else if (yield select(solidity.current.willReturn)) {
    yield put(actions.jump("o"));
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* saga() {
  yield call(tickSaga);
}

export default prefixName("solidity", saga);
