import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { call, put, take, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";
import * as decodeUtils from "lib/data/decode/utils"

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

import * as data from "lib/data/sagas";

/**
 * Adds EVM bytecode context
 *
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addContext(contractName, { address, binary }) {
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
export function* addInstance(address, binary) {
  let search = yield select(evm.info.binaries.search);
  let { context } = search(binary);

  // in case binary is unknown, add context for address
  if (!context) {
    context = yield* addContext(undefined, { address });
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
  let contexts;
  let instances;

  while (true) {
    yield take(TICK);

    // contexts and instances never change, so only capture them the first time
    //
    // HACK these selectors are available before TICK, i.e., they're available
    // after session.READY, but there's no existing hookup for other sagas to
    // wait for READY.
    if (!contexts) {
      contexts = yield select(evm.info.contexts);
      instances = yield select(evm.info.instances);
    }

    if (yield select(evm.current.step.isCall)) {
      debug("got call");
      let address = yield select(evm.current.step.callAddress);

      // HACK
      // if there is no binary (e.g. in the case of precompiled contracts),
      // then there will be no trace steps for the called code, and so we
      // shouldn't tell the debugger that we're entering another execution
      // context
      let { context } = instances[address] || {};
      let { binary } = contexts[context] || {};
      if (!binary) {
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
      if(callstack.length>1 &&
        callstack[callstack.length - 1].address === undefined)
      {

        let dummyAddress = yield select(evm.current.creationDepth);
        debug("dummyAddress %d", dummyAddress);

        let stack = yield select(evm.next.state.stack);
        let createdAddress = decodeUtils.toHexString(
          decodeUtils.toBytes(decodeUtils.toBigNumber(
            stack[stack.length - 1], decodeUtils.WORD_SIZE)), true);
        debug("createdAddress %s", createdAddress);

        yield *data.learnAddressSaga(dummyAddress, createdAddress);
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
