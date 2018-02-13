import debugModule from "debug";
const debug = debugModule("debugger:session:sagas");

import { takeLatest, call, fork, race, take, put, select } from 'redux-saga/effects';

import astSaga from "../ast/sagas";
import controllerSaga from "../controller/sagas";
import soliditySaga from "../solidity/sagas";
import evmSaga from "../evm/sagas";
import traceSaga from "../trace/sagas";

import { END_OF_TRACE } from "../trace/actions";
import * as contextActions from "../context/actions";
import context from "../context/selectors";

import * as actions from "./actions";

export default function *saga () {
  yield *initSaga();

  yield race({
    session: call(sessionSaga),

    cancel: take(END_OF_TRACE)
  });
}

function* initSaga() {
  yield takeLatest(actions.RECORD_CONTRACTS, forContracts);
  yield takeLatest(actions.RECORD_TRACE_CONTEXTS, forTraceContexts);
}

function* sessionSaga() {
  yield fork(traceSaga);
  yield fork(controllerSaga);
  yield fork(evmSaga);
  yield fork(astSaga);
  yield fork(soliditySaga);
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

export function* forContracts({ contracts }) {
  for (let contract of contracts) {
    // create Context for binary and deployed binary
    yield addOrMerge({
      binary: contract.binary,
      addresses: [],
      ast: contract.ast,
      sourceMap: contract.sourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    });

    yield addOrMerge({
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

export function* forTraceContexts({ contexts }) {
  for (let traceContext of contexts) {
    yield addOrMerge(traceContext);
  }
}
