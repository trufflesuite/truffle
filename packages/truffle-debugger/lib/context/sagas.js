import debugModule from "debug";
const debug = debugModule("debugger:context:sagas");

import { call, fork, take, takeLatest, put } from "redux-saga/effects";
import { view } from "../effects";

import * as actions from "./actions";
import context from "./selectors";

export function* forContracts({ contracts }) {
  for (let contract of contracts) {
    // create Context for binary and deployed binary
    // TODO  check for multiple contracts with matching binaries

    yield put(actions.addContext({
      binary: contract.binary,
      sourceMap: contract.sourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    }));

    yield put(actions.addContext({
      binary: contract.deployedBinary,
      sourceMap: contract.deployedSourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    }));
  }
}

export function* forTraceContexts({ contexts }) {

  // TODO determine whether new, or if we have to merge, emit corresponding
  // actions

}

export default function* saga() {
  yield takeLatest(actions.RECORD_CONTRACTS, forContracts);
  // TODO define actions and hook up saga for handling contexts from trace
}
