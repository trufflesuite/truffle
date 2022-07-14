import debugModule from "debug";
const debug = debugModule("debugger:evm:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName, keccak256 } from "lib/helpers";
import * as Codec from "@truffle/codec";
import BN from "bn.js";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import evm from "../selectors";

import * as web3 from "lib/web3/sagas";
import * as trace from "lib/trace/sagas";

/**
 * Adds EVM bytecode context
 *
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addContext(context) {
  //get context hash if context doesn't already have it
  const contextHash =
    context.context || keccak256({ type: "string", value: context.binary });
  //NOTE: we take hash as *string*, not as bytes, because the binary may
  //contain link references!

  debug("context %O", context);
  yield put(actions.addContext({ ...context, context: contextHash }));

  return contextHash;
}

/**
 * Adds to codex known deployed instance of binary at address
 * (not to list of affected instances)
 *
 * @param {string} binary - may be undefined (e.g. precompiles)
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addInstance(address, binary) {
  const search = yield select(evm.info.binaries.search);
  const context = search(binary);

  //now, whether we needed a new context or not, add the instance
  yield put(actions.addInstance(address, context, binary));

  return context;
}

export function* recordStorage(address, slot, word) {
  const slotAsPrefixlessHex = Codec.Conversion.toHexString(
    slot,
    Codec.Evm.Utils.WORD_SIZE
  ).slice(2); //remove "0x" prefix in addition to converting to hex
  yield put(actions.load(address, slotAsPrefixlessHex, word));
}

//NOTE: calling this *can* add a new instance, which will not
//go away on a reset!  Yes, this is a little weird, but we
//decided this is OK for now
export function* requestCode(address) {
  const blockNumber = (yield select(
    evm.transaction.globals.block
  )).number.toString();
  const instances = yield select(evm.current.codex.instances);

  if (address in instances) {
    //because this function is used by data, we return a Uint8Array
    return Codec.Conversion.toBytes(instances[address].binary);
    //former special case here for zero address is now gone since it's
    //now covered by this case
  } else {
    //I don't want to write a new web3 saga, so let's just use
    //obtainBinaries with a one-element array
    debug("fetching binary");
    let binary = (yield* web3.obtainBinaries([address], blockNumber))[0];
    debug("adding instance");
    yield* addInstance(address, binary);
    return Codec.Conversion.toBytes(binary);
  }
}

//NOTE: just like requestCode, this can also add to the codex!
//yes, this is also weird.
export function* requestStorage(slot) {
  //slot is a BN here
  const currentStorage = yield select(evm.current.codex.storage);
  const slotAsHex = Codec.Conversion.toHexString(slot).slice(2); //remove 0x prefix
  if (slotAsHex in currentStorage) {
    //because this function is used by data, we return a Uint8Array
    return Codec.Conversion.toBytes(currentStorage[slotAsHex]);
  }
  //if we don't already know it, we'll have to look it up
  const storageLookup = yield select(evm.application.storageLookup);
  if (storageLookup) {
    const address = (yield select(evm.current.call)).storageAddress;
    const blockHash = yield select(evm.transaction.blockHash); //cannot use number here!
    const txIndex = yield select(evm.transaction.txIndex);
    const word = yield* web3.obtainStorage(address, slot, blockHash, txIndex);
    yield* recordStorage(address, slot, word);
    return Codec.Conversion.toBytes(word);
  } else {
    //indicates to codec this storage is unknown
    return null;
  }
}

/**
 * Adds known deployed instance of binary at address
 * to list of affected instances, *not* to codex
 *
 * creationBinary may also be specified
 *
 * @param {string} binary - may be undefined (e.g. precompiles)
 * @return {string} ID (0x-prefixed keccak of binary)
 */
export function* addAffectedInstance(address, binary, creationBinary) {
  const search = yield select(evm.info.binaries.search);
  const context = search(binary);
  const creationContext = creationBinary ? search(creationBinary) : null;

  //now, whether we needed a new context or not, add the instance
  //note that these last two arguments may be undefined/null
  yield put(
    actions.addAffectedInstance(
      address,
      context,
      binary,
      creationBinary,
      creationContext
    )
  );

  return context;
}

//goes through all instances (codex & affected) and re-adds them with their new
//context (used if new contexts have been added -- something
//that currently only happens when adding external compilations)
export function* refreshInstances() {
  const instances = yield select(evm.current.codex.instances);
  const affectedInstances = yield select(evm.transaction.affectedInstances);
  for (let [address, { binary }] of Object.entries(instances)) {
    const search = yield select(evm.info.binaries.search);
    const context = search(binary);
    yield put(actions.addInstance(address, context, binary));
  }
  for (let [address, { binary, creationBinary }] of Object.entries(
    affectedInstances
  )) {
    const search = yield select(evm.info.binaries.search);
    const context = search(binary);
    const creationContext = creationBinary ? search(creationBinary) : null;
    yield put(
      actions.addAffectedInstance(
        address,
        context,
        binary,
        creationBinary,
        creationContext
      )
    );
  }
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
  block,
  blockHash,
  txIndex
}) {
  yield put(actions.saveGlobals(sender, gasprice, block));
  yield put(actions.saveStatus(status));
  yield put(actions.saveTxIdentification(blockHash, txIndex));
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

//NOTE: We don't account here for multiple simultaneous returns.
//Such a case is *vanishingly* unlikely to come up in real code
//so it's simply not worth the trouble.  Such a case will screw
//up the debugger pretty good as a result.
//(...but I might go back and do it later. :P )

export function* callstackAndCodexSaga() {
  if (yield select(evm.current.step.isExceptionalHalting)) {
    //let's handle this case first so we can be sure everything else is *not*
    //an exceptional halt
    debug("exceptional halt!");

    yield put(actions.fail());
  } else if (yield select(evm.current.step.isInstantCallOrCreate)) {
    // if there is no binary (e.g. for precompiles or externally owned
    // accounts), or if the call fails instantly (callstack overflow or not
    // enough ether), there will be no trace steps for the called code, and so
    // we shouldn't tell the debugger that we're entering another execution
    // context
    // (so we do nothing)
  } else if (yield select(evm.current.step.isCall)) {
    debug("got call");

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
  } else if (yield select(evm.current.step.isNormalHalting)) {
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
  } else if (yield select(evm.current.step.isStore)) {
    let storageAddress = (yield select(evm.current.call)).storageAddress;
    let slot = yield select(evm.current.step.storageAffected);
    let storedValue = yield select(evm.current.step.valueStored);
    yield put(actions.store(storageAddress, slot, storedValue));
  } else if (yield select(evm.current.step.isLoad)) {
    let storageAddress = (yield select(evm.current.call)).storageAddress;
    let slot = yield select(evm.current.step.storageAffected);
    let loadedValue = yield select(evm.current.step.valueLoaded);
    yield put(actions.load(storageAddress, slot, loadedValue));
  }
}

export function* reset() {
  const initialCall = yield select(evm.transaction.initialCall);
  yield put(actions.reset());
  yield put(initialCall);
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* setStorageLookup(status) {
  const supported = yield* isStorageLookupSupported();
  if (status && !supported) {
    throw new Error(
      "The storageLookup option was passed, but the debug_storageRangeAt method is not available on this client."
    );
  }
  yield put(actions.setStorageLookup(status));
}

function* isStorageLookupSupported() {
  const storedValue = yield select(evm.application.storageLookupSupported);
  //exit out early if it's already set
  if (storedValue !== null) {
    return storedValue;
  }
  const blockHash = yield select(evm.transaction.blockHash); //cannot use number here!
  let supported;
  try {
    //note we need to use a blockHash and txIndex that actually exists, otherwise
    //we'll get an error for a different reason; that's why this procedure is
    //only performed once we have a transaction loaded, even though notionally it's
    //independent of any transaction
    yield* web3.obtainStorage(
      Codec.Evm.Utils.ZERO_ADDRESS,
      new BN(0),
      blockHash,
      0 //to avoid delays, we'll use 0 rather than the actual tx index...
      //index 0 certainly exists as long as the block has any transactions!
    ); //throw away the value
    supported = true;
  } catch {
    supported = false;
  }
  yield put(actions.setStorageLookupSupport(supported));
  return supported;
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("evm", saga);
