import debugModule from "debug";
const debug = debugModule("debugger:web3:sagas");

import { takeEvery, takeLatest, apply, fork, race, take, put, select } from 'redux-saga/effects';

import * as actions from "./actions";

import Web3Adapter from "./adapter";

export function* inspectTransaction(adapter, {txHash}) {
  debug("inspecting transaction");
  var trace;
  try {
    trace = yield apply(adapter, adapter.getTrace, [txHash]);
  } catch(e) {
    debug("putting error");
    yield put(actions.error(e));
    return;
  }

  debug("got trace");
  yield put(actions.receiveTrace(trace));

  let tx = yield apply(adapter, adapter.getTransaction, [txHash]);
  if (tx.to && tx.to != "0x0") {
    yield put(actions.receiveCall({address: tx.to}));
    return;
  }

  let receipt = yield apply(adapter, adapter.getReceipt, [txHash]);
  if (receipt.contractAddress) {
    yield put(actions.receiveCall({binary: receipt.input}));
    return;
  }

  throw new Error(
    "Could not find contract associated with transaction. " +
    "Please make sure you're debugging a transaction that executes a " +
    "contract function or creates a new contract."
  );
}

export function* fetchBinary(adapter, {address}) {
  debug("fetching binary for %s", address);
  let binary = yield apply(adapter, adapter.getDeployedCode, [address]);

  debug("received binary for %s", address);
  yield put(actions.receiveBinary(address, binary));
}

export default function* saga() {
  // wait for web3 init signal
  let {provider} = yield take(actions.INIT_WEB3);
  let adapter = new Web3Adapter(provider);

  yield takeLatest(actions.INSPECT, inspectTransaction, adapter);
  yield takeEvery(actions.FETCH_BINARY, fetchBinary, adapter);
}
