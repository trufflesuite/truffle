import debugModule from "debug";
const debug = debugModule("debugger:session:sagas");

import { call, all, fork, join, take, put, select } from 'redux-saga/effects';

import astSaga from "../ast/sagas";
import controllerSaga from "../controller/sagas";
import soliditySaga from "../solidity/sagas";
import evmSaga from "../evm/sagas";
import traceSaga from "../trace/sagas";
import web3Saga from "../web3/sagas";

import * as contextActions from "../context/actions";
import * as traceActions from "../trace/actions";
import * as web3Actions from "../web3/actions";
import * as evmActions from "../evm/actions";
import * as actions from "./actions";

import context from "../context/selectors";

export default function *saga () {
  yield fork(web3Saga);
  yield fork(traceSaga);
  yield fork(controllerSaga);
  yield fork(evmSaga);
  yield fork(astSaga);
  yield fork(soliditySaga);

  yield *initSaga();
}

function* initSaga() {
  // save contracts
  let {contracts} = yield take(actions.RECORD_CONTRACTS);
  yield call(forContracts, contracts);

  // start session for tx
  let {txHash, provider} = yield take(actions.START);

  yield put(web3Actions.init(provider));
  yield put(web3Actions.inspect(txHash));

  let {trace} = yield take(web3Actions.RECEIVE_TRACE);
  debug("received trace");

  let {address, binary} = yield take(web3Actions.RECEIVE_CALL);
  debug("received call");
  if (address) {
    yield put(evmActions.call(address));
  } else {
    yield put(evmActions.create(binary));
  }

  yield put(traceActions.saveSteps(trace));

  let {addresses} = yield take(traceActions.RECEIVE_ADDRESSES);
  debug("received addresses");
  if (address && addresses.indexOf(address) == -1) {
    addresses.push(address);
  }

  debug("listening for context info");
  let tasks = yield all(
    addresses.map( (address) => fork(receiveContext, address) )
  );

  debug("requesting context info");
  yield all(
    addresses.map( (address) => call(fetchContext, address) )
  );

  debug("waiting");
  yield join(...tasks);

  debug("ready");
  yield put(actions.ready());
}

function *fetchContext(address) {
  debug("fetching context for %s", address);
  yield put(web3Actions.fetchBinary(address));
}

function *receiveContext(address) {
  let {binary} = yield take((action) => (
    action.type == web3Actions.RECEIVE_BINARY &&
    action.address == address
  ));
  debug("got binary for %s", address);

  yield *addOrMerge({binary, addresses: [address]});
  debug("add-or-merged %s", address);
}

function *addOrMerge(newContext) {
  debug("inside addOrMerge %o", newContext.binary);
  let binaryIndexes = yield select(context.indexBy.binary);

  let index = binaryIndexes[newContext.binary];
  debug("index: %o", index);
  if (index !== undefined) {
    // existing context, merge
    yield put(contextActions.mergeContext(index, newContext))

  } else {
    // new
    yield put(contextActions.addContext(newContext));
  }
}

export function* forContracts(contracts) {
  for (let contract of contracts) {
    // create Context for binary and deployed binary
    yield *addOrMerge({
      binary: contract.binary,
      addresses: [],
      ast: contract.ast,
      sourceMap: contract.sourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    });

    yield *addOrMerge({
      binary: contract.deployedBinary,
      addresses: [],
      ast: contract.ast,
      sourceMap: contract.deployedSourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    });
  }
}
