import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

import * as trace from "lib/trace/sagas";

/**
 * Adds EVM bytecode context
 *
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addContext(context) {
  const contextHash = keccak256({ type: "string", value: context.binary });
  //NOTE: we take hash as *string*, not as bytes, because the binary may
  //contain link references!

  debug("context %O", context);
  yield put(actions.addContext(context));

  return contextHash;
}

export function* normalizeContexts() {
  yield put(actions.normalizeContexts());
}

/**
 * Adds known deployed instance of binary at address
 *
 * @param {string} binary - may be undefined (e.g. precompiles)
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addInstance(address, binary) {
  let search = yield select(evm.info.binaries.search);
  let context = search(binary);

  //now, whether we needed a new context or not, add the instance
  yield put(actions.addInstance(address, context, binary));

  return context;
}

export function* begin({
  address,
  binary,
  data,
  storageAddress,
  status,
  sender,
  value,
  gasprice,
  block
}) {
  yield put(actions.saveGlobals(sender, gasprice, block));
  yield put(actions.saveStatus(status));
  debug("codex: %O", yield select(evm.current.codex));
  if (address) {
    yield put(actions.call(address, data, storageAddress, sender, value));
  } else {
    yield put(actions.create(binary, storageAddress, sender, value));
  }
}

function* tickSaga() {
  debug("got TICK");

  yield* callstackAndCodexSaga();
  yield* trace.signalTickSagaCompletion();
}

export function* callstackAndCodexSaga() {
  if (yield select(evm.current.step.isExceptionalHalting)) {
    //let's handle this case first so we can be sure everything else is *not*
    //an exceptional halt
    debug("exceptional halt!");

    yield put(actions.fail());
  } else if (yield select(evm.current.step.isCall)) {
    debug("got call");
    // if there is no binary (e.g. in the case of precompiled contracts or
    // externally owned accounts), then there will be no trace steps for the
    // called code, and so we shouldn't tell the debugger that we're entering
    // another execution context
    if (yield select(evm.current.step.callsPrecompileOrExternal)) {
      return;
    }

    let address = yield select(evm.current.step.callAddress);
    let data = yield select(evm.current.step.callData);

    debug("calling address %s", address);

    if (yield select(evm.current.step.isDelegateCallStrict)) {
      //if delegating, leave storageAddress, sender, and value the same
      let { storageAddress, sender, value } = yield select(evm.current.call);
      yield put(actions.call(address, data, storageAddress, sender, value));
    } else {
      //this branch covers CALL, CALLCODE, and STATICCALL
      let currentCall = yield select(evm.current.call);
      let storageAddress = (yield select(evm.current.step.isDelegateCallBroad))
        ? currentCall.storageAddress //for CALLCODE
        : address;
      let sender = currentCall.storageAddress; //not the code address!
      let value = yield select(evm.current.step.callValue); //0 if static
      yield put(actions.call(address, data, storageAddress, sender, value));
    }
  } else if (yield select(evm.current.step.isCreate)) {
    debug("got create");
    let binary = yield select(evm.current.step.createBinary);
    let createdAddress = yield select(evm.current.step.createdAddress);
    let value = yield select(evm.current.step.createValue);
    let sender = (yield select(evm.current.call)).storageAddress;
    //not the code address!

    yield put(actions.create(binary, createdAddress, sender, value));
    //as above, storageAddress handles when calling from a creation call
  } else if (yield select(evm.current.step.isHalting)) {
    debug("got return");

    let { binary, storageAddress } = yield select(evm.current.call);

    if (binary) {
      //if we're returning from a successful creation call, let's log the
      //result
      let returnedBinary = yield select(evm.current.step.returnValue);
      let search = yield select(evm.info.binaries.search);
      let returnedContext = search(returnedBinary);
      yield put(
        actions.returnCreate(storageAddress, returnedBinary, returnedContext)
      );
    } else {
      yield put(actions.returnCall());
    }
  } else if (yield select(evm.current.step.touchesStorage)) {
    let storageAddress = (yield select(evm.current.call)).storageAddress;
    let slot = yield select(evm.current.step.storageAffected);
    //note we get next storage, since we're updating to that
    let storage = yield select(evm.next.state.storage);
    //normally we'd need a 0 fallback for this next line, but in this case we
    //can be sure the value will be there, since we're touching that storage
    if (yield select(evm.current.step.isStore)) {
      yield put(actions.store(storageAddress, slot, storage[slot]));
    } else {
      //otherwise, it's a load
      yield put(actions.load(storageAddress, slot, storage[slot]));
    }
  }
}

export function* reset() {
  let initialCall = yield select(evm.transaction.initialCall);
  yield put(actions.reset());
  yield put(initialCall);
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("evm", saga);
