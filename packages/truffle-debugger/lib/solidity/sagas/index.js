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
    //we have several cases here:
    //1. precompile -- *don't* put any jump
    //2. workaround case -- put a double jump (see below)
    //3. general case -- put a single jump as expected

    debug("about to call");
    if (yield select(solidity.current.callsPrecompile)) {
      //call to precompile; do nothing
    } else if (
      (yield select(solidity.current.needsFunctionDepthWorkaround)) &&
      (yield select(solidity.current.isContractCall))
    ) {
      //all these parentheses are necessary
      //HACK WORKAROUND
      //because of the problem in solc <0.5.1 where contract method calls
      //essentially return twice, we compensate by putting *two* inward jumps
      //for such a call.
      //Note that this won't work if the contract method was previously placed
      //in a function variable!  Those will continue to screw things up!  But
      //if a contract call is being made directly, we can detect that.
      //Of course, all of this should work fine as of solidity 0.5.1, with no
      //workaround necessary; this branch should only get take on old
      //contracts.
      debug("workaround invoked!");
      yield put(actions.jump("2"));
    } else {
      //an ordinary call, not to a precompile & with no workaround needed
      yield put(actions.jump("i"));
    }
  } else if (yield select(solidity.current.willCreate)) {
    //this case, thankfully, needs no further breakdown
    yield put(actions.jump("i"));
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
