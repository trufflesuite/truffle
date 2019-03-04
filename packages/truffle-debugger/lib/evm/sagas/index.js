import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

import * as data from "lib/data/sagas";
import * as trace from "lib/trace/sagas";

import * as DecodeUtils from "truffle-decode-utils";

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

export function* begin({ address, binary, data }) {
  if (address) {
    yield put(actions.call(address, data));
  } else {
    yield put(actions.create(binary));
  }
}

function* tickSaga() {
  debug("got TICK");

  yield* callstackSaga();
  yield* trace.signalTickSagaCompletion();
}

export function* callstackSaga() {
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

    yield put(actions.call(address, data));
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

      //NOTE: the following logic, for getting the created address, really
      //belongs in a selector.  However, every time I try to make it a
      //selector, I get mysterious error messages.  So, we'll do it ourselves
      //in the saga instead.

      let stack = yield select(evm.next.state.stack);
      let createdAddress = DecodeUtils.Conversion.toAddress(
        stack[stack.length - 1]
      );
      debug("createdAddress %s", createdAddress);

      yield* data.learnAddressSaga(dummyAddress, createdAddress);
      debug("address learnt");
    }

    yield put(actions.returnCall());
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("evm", saga);
