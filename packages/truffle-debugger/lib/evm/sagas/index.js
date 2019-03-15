import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

import * as DecodeUtils from "truffle-decode-utils";

import * as trace from "lib/trace/sagas";

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

export function* begin({ address, binary, data, storageAddress }) {
  if (address) {
    yield put(actions.call(address, data, storageAddress));
  } else {
    yield put(actions.create(binary, storageAddress));
  }
}

function* tickSaga() {
  debug("got TICK");

  yield* callstackAndCodexSaga();
  yield* trace.signalTickSagaCompletion();
}

export function* callstackAndCodexSaga() {
  if (yield select(evm.current.step.isCall)) {
    debug("got call");
    let address = yield select(evm.current.step.callAddress);
    let data = yield select(evm.current.step.callData);

    debug("calling address %s", address);

    // if there is no binary (e.g. in the case of precompiled contracts),
    // then there will be no trace steps for the called code, and so we
    // shouldn't tell the debugger that we're entering another execution
    // context
    if (yield select(evm.current.step.callsPrecompile)) {
      return;
    }
    if (yield select(evm.current.step.isDelegateCallBroad)) {
      //if delegating, keep same storage address we already have
      let storageAddress = (yield select(evm.current.call)).storageAddress;
      yield put(actions.call(address, data, storageAddress));
    } else {
      //if we're not delegating storage, storageAddress == address
      yield put(actions.call(address, data, address));
    }
  } else if (yield select(evm.current.step.isCreate)) {
    debug("got create");
    let binary = yield select(evm.current.step.createBinary);
    let createdAddress = yield select(evm.current.step.createdAddress);

    yield put(actions.create(binary, createdAddress));
  } else if (yield select(evm.current.step.isHalting)) {
    debug("got return");

    yield put(actions.returnCall());
  } else if (yield select(evm.current.step.touchesStorage)) {
    let storageAddress = (yield select(evm.current.call)).storageAddress;
    //skip doing a touch operation if it's the zero address, since we can't
    //track things reliably in that case; we'll fall back on the old state
    //mechanism in that case
    if (storageAddress !== DecodeUtils.EVM.ZERO_ADDRESS) {
      let slot = yield select(evm.current.step.storageAffected);
      //note we get next storage, since we're updating to that
      let storage = yield select(evm.next.state.storage);
      //normally we'd need a 0 fallback for this next line, but in this case we
      //can be sure the value will be there, since we're touching that storage
      yield put(actions.store(storageAddress, slot, storage[slot]));
    }
  }
}

export function* reset() {
  let initialAddress = (yield select(evm.current.callstack))[0].storageAddress;
  yield put(actions.reset(initialAddress));
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("evm", saga);
