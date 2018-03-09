import debugModule from "debug";
const debug = debugModule("debugger:session:sagas");

import { call, all, fork, take, put } from 'redux-saga/effects';

import { prefixName } from "lib/helpers";

import * as ast from "lib/ast/sagas";
import * as context from "lib/context/sagas";
import * as controller from "lib/controller/sagas";
import * as solidity from "lib/solidity/sagas";
import * as evm from "lib/evm/sagas";
import * as trace from "lib/trace/sagas";
import * as data from "lib/data/sagas";
import * as web3 from "lib/web3/sagas";

import * as actions from "../actions";

export function *saga () {
  yield fork(web3.saga);
  yield fork(trace.saga);
  yield fork(controller.saga);
  yield fork(evm.saga);
  yield fork(ast.saga);
  yield fork(solidity.saga);
  yield fork(data.saga);

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

export default prefixName("session", saga);

function* fetchTx(txHash, provider) {
  let result = yield *web3.inspectTransaction(txHash, provider);

  if (result.error) {
    return result.error;
  }

  yield *evm.begin(result);

  let addresses = yield *trace.processTrace(result.trace);
  if (result.address && addresses.indexOf(result.address) == -1) {
    addresses.push(result.address);
  }

  let binaries = yield *web3.obtainBinaries(addresses);

  yield all(
    addresses.map( (address, i) => call(context.addOrMerge, {
      binary: binaries[i],
      addresses: [address],
    }))
  );
}

function *ready() {
  debug("ready");
  yield put(actions.ready());
}

function *error(err) {
  debug("error");
  yield put(actions.error(err));
}

function* recordContracts(...contracts) {
  for (let contract of contracts) {
    // create Context for binary and deployed binary
    yield *context.addOrMerge({
      binary: contract.binary,
      addresses: [],
      ast: contract.ast,
      sourceMap: contract.sourceMap,
      source: contract.source,
      sourcePath: contract.sourcePath,
      contractName: contract.contractName
    });

    yield *context.addOrMerge({
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

