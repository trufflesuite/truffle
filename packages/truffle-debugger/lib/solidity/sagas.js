import debugModule from "debug";
const debug = debugModule("debugger:solidity:sagas");

import { call, put, take } from "redux-saga/effects";
import { view } from "../effects";

import { TICK } from "../controller/actions";
import * as actions from "./actions";

import { nextStep } from "../selectors";

export function* functionDepthSaga () {
  while (true) {
    yield take(TICK);
    debug("got TICK");
    let instruction = yield view(nextStep.solidity.nextInstruction);
    debug("instruction: %o", instruction);

    if (yield view(nextStep.evm.isJump)) {
      let jumpDirection = yield view(nextStep.solidity.jumpDirection);


      yield put(actions.jump(jumpDirection));
    }
  }
}


export default function* saga () {
  yield call(functionDepthSaga);
}
