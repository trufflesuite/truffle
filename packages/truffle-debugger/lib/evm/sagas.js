import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { call, put, take } from "redux-saga/effects";
import { view } from "../effects";

import { TICK } from "../trace/actions";
import * as actions from "./actions";

import evm from "./selectors";

export function* callstackSaga () {
  while (true) {
    yield take(TICK);
    debug("got TICK");

    if (yield view(evm.nextStep.isCall)) {
      debug("got call");
      let address = yield view(evm.nextStep.callAddress);

      yield put(actions.call(address));

    } else if (yield view(evm.nextStep.isCreate)) {
      debug("got create");
      let binary = yield view(evm.nextStep.createBinary);

      yield put(actions.create(binary));

    } else if (yield view(evm.nextStep.isHalting)) {
      debug("got return");
      yield put(actions.returnCall());
    }
  }
}

export default function* saga () {
  yield call(callstackSaga);
}
