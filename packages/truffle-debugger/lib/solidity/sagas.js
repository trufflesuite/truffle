import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { call, put, take } from "redux-saga/effects";
import { view } from "../effects";

import { TICK } from "../controller/actions";
import evm from "../evm/selectors";

import * as actions from "./actions";
import solidity from "./selectors";

export function* functionDepthSaga () {
  while (true) {
    yield take(TICK);
    debug("got TICK");
    let instruction = yield view(solidity.nextStep.nextInstruction);
    debug("instruction: %o", instruction);

    if (yield view(evm.nextStep.isJump)) {
      let jumpDirection = yield view(solidity.nextStep.jumpDirection);


      yield put(actions.jump(jumpDirection));
    }
  }
}


export default function* saga () {
  yield call(functionDepthSaga);
}
