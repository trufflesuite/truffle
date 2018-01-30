import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { call, put, take, select } from "redux-saga/effects";

import { TICK } from "../trace/actions";
import evm from "../evm/selectors";

import * as actions from "./actions";
import solidity from "./selectors";

function* functionDepthSaga () {
  while (true) {
    yield take(TICK);
    debug("got TICK");
    let instruction = yield select(solidity.nextStep.nextInstruction);
    debug("instruction: %o", instruction);

    if (yield select(evm.nextStep.isJump)) {
      let jumpDirection = yield select(solidity.nextStep.jumpDirection);


      yield put(actions.jump(jumpDirection));
    }
  }
}


export default function* saga () {
  yield call(functionDepthSaga);
}
