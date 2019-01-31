import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { call, put, take, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

import * as data from "lib/data/sagas";

/**
 * Adds EVM bytecode context
 *
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addContext(contractName, { address, binary }, compiler) {
  const raw = binary || address;
  const context = keccak256(raw);

  yield put(actions.addContext(contractName, raw, compiler));

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
export function* addInstance(address, binary) {
  let search = yield select(evm.info.binaries.search);
  let { context } = search(binary);

  // in case binary is unknown, add context for address
  if (!context) {
    context = yield* addContext(undefined, { address }, undefined);
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

export function* callstackSaga() {
  while (true) {
    yield take(TICK);

    if (yield select(evm.current.step.isCall)) {
      debug("got call");
      let address = yield select(evm.current.step.callAddress);

      // if there is no binary (e.g. in the case of precompiled contracts),
      // then there will be no trace steps for the called code, and so we
      // shouldn't tell the debugger that we're entering another execution
      // context
      if (yield select(evm.current.step.callsPrecompile)) {
        continue;
      }

      yield put(actions.call(address));
    } else if (yield select(evm.current.step.isCreate)) {
      debug("got create");
      let binary = yield select(evm.current.step.createBinary);

      yield put(actions.create(binary));
    } else if (yield select(evm.current.step.isHalting)) {
      debug("got return");

      let callstack = yield select(evm.current.callstack);

      //if the program's not ending, and we just returned from a constructor,
      //learn the address of what we just initialized
      //(do this before we put the return action to avoid off-by-one error)
      if (
        callstack.length > 1 &&
        callstack[callstack.length - 1].address === undefined
      ) {
        let dummyAddress = yield select(evm.current.creationDepth);
        debug("dummyAddress %d", dummyAddress);

        let createdAddress = yield select(evm.current.createdAddress);
        debug("createdAddress %s", createdAddress);

        yield* data.learnAddressSaga(dummyAddress, createdAddress);
        debug("address learnt");
      }

      yield put(actions.returnCall());
    }
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* saga() {
  yield call(callstackSaga);
}

export default prefixName("evm", saga);
