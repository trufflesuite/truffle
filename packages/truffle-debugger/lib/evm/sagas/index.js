import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { call, put, take, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

/**
 * Adds EVM bytecode context
 *
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function *addContext(contractName, binary) {
  yield put(actions.addContext(contractName, binary));

  return keccak256(binary);
}

/**
 * Adds known deployed instance of binary at address
 *
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function *addInstance(address, binary) {
  let contexts = yield select(evm.info.contexts);
  let search = yield select(evm.info.binaries.search);
  let { context } = search(binary);

  yield put(actions.addInstance(address, context, binary));

  return context;
}

export function* begin({ address, binary }) {
  if (address) {
    yield put(actions.call(address));
  } else {
    yield put(actions.create(binary));
  }
}

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

export function* saga () {
  yield call(callstackSaga);
}

export default prefixName("evm", saga);
