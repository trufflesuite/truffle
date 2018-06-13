import debugModule from "debug";
const debug = debugModule("debugger:web3:sagas");

import { all, takeEvery, apply, fork, join, take, put, select } from 'redux-saga/effects';
import { prefixName } from "lib/helpers";

import * as actions from "../actions";

import Web3Adapter from "../adapter";

function* fetchTransactionInfo(adapter, {txHash}) {
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
    yield put(actions.receiveCall({binary: tx.input}));
    return;
  }

  throw new Error(
    "Could not find contract associated with transaction. " +
    "Please make sure you're debugging a transaction that executes a " +
    "contract function or creates a new contract."
  );
}

function* fetchBinary(adapter, {address}) {
  debug("fetching binary for %s", address);
  let binary = yield apply(adapter, adapter.getDeployedCode, [address]);

  debug("received binary for %s", address);
  yield put(actions.receiveBinary(address, binary));
}

export function *inspectTransaction(txHash, provider) {
  yield put(actions.init(provider));
  yield put(actions.inspect(txHash));

  let action = yield take( ({type}) =>
    type == actions.RECEIVE_TRACE || type == actions.ERROR_WEB3
  );
  debug("action %o", action);

  var trace;
  if (action.type == actions.RECEIVE_TRACE) {
    trace = action.trace;
    debug("received trace");
  } else {
    return { error: action.error };
  }

  let {address, binary} = yield take(actions.RECEIVE_CALL);
  debug("received call");

  return { trace, address, binary };
}

export function *obtainBinaries(addresses) {
  let tasks = yield all(
    addresses.map( (address) => fork(receiveBinary, address) )
  );

  debug("requesting binaries");
  yield all(
    addresses.map( (address) => put(actions.fetchBinary(address)) )
  );

  let binaries = [];
  binaries = yield all(
    tasks.map(task => join(task))
  );

  debug("binaries %o", binaries);

  return binaries;
}

function *receiveBinary(address) {
  let {binary} = yield take((action) => (
    action.type == actions.RECEIVE_BINARY &&
    action.address == address
  ));
  debug("got binary for %s", address);

  return binary;
}

export function* saga() {
  // wait for web3 init signal
  let {provider} = yield take(actions.INIT_WEB3);
  let adapter = new Web3Adapter(provider);

  yield takeEvery(actions.INSPECT, fetchTransactionInfo, adapter);
  yield takeEvery(actions.FETCH_BINARY, fetchBinary, adapter);
}

export default prefixName("web3", saga);
