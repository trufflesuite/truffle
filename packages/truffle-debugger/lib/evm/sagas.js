import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { call, put, take, select } from "redux-saga/effects";

import { TICK } from "lib/trace/actions";
import * as actions from "./actions";

import evm from "./selectors";

export function* callstackSaga () {
  while (true) {
    yield take(TICK);
    debug("got TICK");

    if (yield select(evm.next.step.isCall)) {
      debug("got call");
      let address = yield select(evm.next.step.callAddress);

      yield put(actions.call(address));

    } else if (yield select(evm.next.step.isCreate)) {
      debug("got create");
      let binary = yield select(evm.next.step.createBinary);

      yield put(actions.create(binary));

    } else if (yield select(evm.next.step.isHalting)) {
      debug("got return");
      yield put(actions.returnCall());
    }
  }
}

export default function* saga () {
  yield call(callstackSaga);
}
