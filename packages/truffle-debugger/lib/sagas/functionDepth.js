import debugModule from "debug";
const debug = debugModule("debugger:sagas:functionDepth");

import { put, take } from "redux-saga/effects";
import { view } from "../effects";

import { TICK } from "../actions/controller";
import * as actions from "../actions/functionDepth";

import { nextStep } from "../selectors";

export default function* watchForJumps () {
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
