import debugModule from "debug";
const debug = debugModule("debugger:context:sagas");

import { takeLatest, put, select } from "redux-saga/effects";

import * as actions from "./actions";
import context from "./selectors";

function *addOrMerge(newContext) {
  debug("inside addOrMerge %o", newContext.binary);
  let binaryIndexes = yield select(context.indexBy.binary);

  let all = yield select(context.list);
  debug("all: %o", all);

  let index = binaryIndexes[newContext.binary];
  debug("index: %o", index);
  if (index !== undefined) {
    // existing context, merge
    yield put(actions.mergeContext(index, newContext))

  } else {
    // new
    yield put(actions.addContext(newContext));
  }
}

export function* forContracts({ contracts }) {
  for (let contract of contracts) {
    // create Context for binary and deployed binary
    yield addOrMerge({
      binary: contract.binary,
      addresses: [],
      sourceMap: contract.sourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    });

    yield addOrMerge({
      binary: contract.deployedBinary,
      addresses: [],
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

export default function* saga() {
  yield takeLatest(actions.RECORD_CONTRACTS, forContracts);
  yield takeLatest(actions.RECORD_TRACE_CONTEXTS, forTraceContexts);
}
