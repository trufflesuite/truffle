import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { call, put, take, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";

import solidity from "../selectors";

export function *addSource(source, sourcePath, ast) {
  yield put(actions.addSource(source, sourcePath, ast));
}

export function *addSourceMap(binary, sourceMap) {
  yield put(actions.addSourceMap(binary, sourceMap));
}

function *tickSaga() {
  while (true) {
    yield take(TICK);
    debug("got TICK");

    yield *functionDepthSaga();
  }
}

function* functionDepthSaga () {
  if (yield select(solidity.current.willJump)) {
    let jumpDirection = yield select(solidity.current.jumpDirection);


    yield put(actions.jump(jumpDirection));
  }
}

export function* saga () {
  yield call(tickSaga);
}

export default prefixName("solidity", saga);
