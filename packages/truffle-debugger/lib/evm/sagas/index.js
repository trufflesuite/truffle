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
export function *addContext(contractName, { address, binary }) {
  const raw = binary || address;
  const context = keccak256(raw);

  yield put(actions.addContext(contractName, raw));

  if (binary) {
    yield put(actions.addBinary(context, binary));
  }

  return context;
}

/**
 * Adds known deployed instance of binary at address
 *
 * @param {string} binary - may be undefined (e.g. precompiles)
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function *addInstance(address, binary) {
  let search = yield select(evm.info.binaries.search);
  let { context } = search(binary);

  // in case binary is unknown, add context for address
  if (!context) {
    context = yield *addContext(undefined, { address });
  }

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

    if (yield select(evm.current.step.isCall)) {
      debug("got call");
      let address = yield select(evm.current.step.callAddress);

      yield put(actions.call(address));

    } else if (yield select(evm.current.step.isCreate)) {
      debug("got create");
      let binary = yield select(evm.current.step.createBinary);

      yield put(actions.create(binary));

    } else if (yield select(evm.current.step.isHalting)) {
      debug("got return");
      yield put(actions.returnCall());
    }
  }
}

export function* saga () {
  yield call(callstackSaga);
}

export default prefixName("evm", saga);
