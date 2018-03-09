import debugModule from "debug";
const debug = debugModule("debugger:session:sagas");

import { cancel, call, all, fork, join, take, put, race, select } from 'redux-saga/effects';

import astSaga, * as ast from "lib/ast/sagas";
import controllerSaga, * as controller from "lib/controller/sagas";
import soliditySaga, * as solidity from "lib/solidity/sagas";
import evmSaga, * as evm from "lib/evm/sagas";
import traceSaga, * as trace from "lib/trace/sagas";
import dataSaga, * as data from "lib/data/sagas";
import web3Saga, * as web3 from "lib/web3/sagas";

import * as contextActions from "lib/context/actions";
import * as web3Actions from "lib/web3/actions";
import * as actions from "../actions";

import context from "lib/context/selectors";

export default function *saga () {
  yield fork(web3Saga);
  yield fork(traceSaga);
  yield fork(controllerSaga);
  yield fork(evmSaga);
  yield fork(astSaga);
  yield fork(soliditySaga);
  yield fork(dataSaga);

  let {contracts} = yield take(actions.RECORD_CONTRACTS);
  yield *recordContracts(...contracts);

  let {txHash, provider} = yield take(actions.START);
  let err = yield *fetchTx(txHash, provider);
  debug("err %o", err);
  if (err) {
    yield *error(err);
    return;
  }

  yield *ast.visitAll();

  yield *ready();

  yield *trace.wait();

  yield put(actions.finish());
}

function* fetchTx(txHash, provider) {
  let result = yield* web3.inspectTransaction(txHash, provider);

  if (result.error) {
    return result.error;
  }

  yield *evm.begin(result);

  let addresses = yield *trace.processTrace(result.trace);
  if (result.address && addresses.indexOf(result.address) == -1) {
    addresses.push(result.address);
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
  if (tasks.length > 0) {
    yield join(...tasks);
  }
}

function *ready() {
  debug("ready");
  yield put(actions.ready());
}

function *error(err) {
  debug("error");
  yield put(actions.error(err));
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

export function* recordContracts(...contracts) {
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

