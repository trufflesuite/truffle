import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { call, put, take, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";

import solidity from "../selectors";


function* functionDepthSaga () {
  while (true) {
    yield take(TICK);
    debug("got TICK");
    let instruction = yield select(solidity.next.instruction);
    debug("instruction: %o", instruction);

    if (yield select(solidity.next.willJump)) {
      let jumpDirection = yield select(solidity.next.jumpDirection);


      yield put(actions.jump(jumpDirection));
    }
  }
}

export default prefixName("solidity", function* saga () {
  yield call(functionDepthSaga);
})
