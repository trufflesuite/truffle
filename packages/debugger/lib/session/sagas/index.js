import debugModule from "debug";
const debug = debugModule("debugger:session:sagas");

import { call, all, fork, take, put, race, select } from "redux-saga/effects";

import { prefixName } from "lib/helpers";

import * as ast from "lib/ast/sagas";
import * as controller from "lib/controller/sagas";
import * as sourcemapping from "lib/sourcemapping/sagas";
import * as stacktrace from "lib/stacktrace/sagas";
import * as evm from "lib/evm/sagas";
import * as trace from "lib/trace/sagas";
import * as data from "lib/data/sagas";
import * as txlog from "lib/txlog/sagas";
import * as web3 from "lib/web3/sagas";

import * as actions from "../actions";

import session from "../selectors";

const LOAD_SAGAS = {
  [actions.LOAD_TRANSACTION]: load,
  //will also add reconstruct action/saga once it exists
  //the following ones don't really relate to loading, but, oh well
  [actions.ADD_COMPILATIONS]: addCompilations,
  [actions.START_FULL_MODE]: startFullMode
};

function* listenerSaga() {
  while (true) {
    let action = yield take(Object.keys(LOAD_SAGAS));
    let saga = LOAD_SAGAS[action.type];

    yield put(actions.wait());
    yield race({
      exec: call(saga, action), //not all will use this
      interrupt: take(actions.INTERRUPT)
    });
    yield put(actions.ready());
  }
}

export function* saga(moduleOptions) {
  debug("starting listeners");
  yield* forkListeners(moduleOptions);

  // receiving & saving contracts into state
  debug("waiting for contract information");
  const { contexts, sources, contracts } = yield take(actions.RECORD_CONTRACTS);

  debug("recording contract binaries");
  yield* recordContexts(contexts);

  debug("recording contract sources");
  yield* recordSources(sources);

  //note: even this goes in data, we'll do it even in light
  //mode for simplicity
  debug("recording other contract info");
  yield* recordContracts(contracts);

  debug("waiting for start");
  // wait for start signal
  let { txHash, provider } = yield take(actions.START);
  debug("starting");

  if (!moduleOptions.lightMode) {
    debug("visiting ASTs");
    // visit asts
    yield* ast.visitAll();

    //save allocation table
    debug("saving allocation table");
    yield* data.recordAllocations();

    //note: we don't need to explicitly set full mode, it's the default
  } else {
    debug("setting light mode");
    yield put(actions.setLightMode());
  }

  //initialize web3 adapter
  debug("initializing adapter");
  yield* web3.init(provider);

  //process transaction (if there is one)
  //(note: this part may also set the error state)
  if (txHash !== undefined) {
    yield* processTransaction(txHash, moduleOptions);
  }

  debug("readying");
  // signal that commands can begin
  yield* ready();
}

//please only use in light mode!
function* addCompilations({ sources, contexts, contracts }) {
  debug("recording contract binaries");
  yield* recordContexts(contexts);

  debug("recording contract sources");
  yield* recordSources(sources);

  //see comment above about this
  debug("recording other contract info");
  yield* recordContracts(contracts);

  debug("refreshing instances");
  yield* evm.refreshInstances();
}

function* startFullMode() {
  debug("session: %O", session);
  const lightMode = yield select(session.status.lightMode);
  if (!lightMode) {
    //better not start this twice!
    return;
  }
  debug("turning on data & txlog listeners");
  const listenersToActivate = [data.saga, txlog.saga];
  for (const listener of listenersToActivate) {
    yield fork(listener);
  }

  debug("visiting ASTs");
  // visit asts
  yield* ast.visitAll();

  //save allocation table
  debug("saving allocation table");
  yield* data.recordAllocations();

  yield* trace.addSubmoduleToCount(listenersToActivate.length);

  if (yield select(session.status.loaded)) {
    //begin any full-mode modules that need beginning
    yield* txlog.begin();
    //we don't need to perform setup regarding storage visibility,
    //as that will have been already been done on tx load
  }

  yield put(actions.setFullMode());
}

export function* processTransaction(txHash, loadOptions) {
  // process transaction
  debug("fetching transaction info");
  let err = yield* fetchTx(txHash, loadOptions);
  if (err) {
    debug("error %o", err);
    yield* error(err);
  }
}

export default prefixName("session", saga);

function* forkListeners(moduleOptions) {
  yield fork(listenerSaga); //session listener; this one is separate, sorry
  //(I didn't want to mess w/ the existing structure of defaults)
  let mainApps = [evm, sourcemapping, stacktrace];
  if (!moduleOptions.lightMode) {
    mainApps.push(data);
    mainApps.push(txlog);
  }
  let otherApps = [controller, web3];
  const submoduleCount = mainApps.length;
  const apps = mainApps.concat(otherApps);
  yield* trace.setSubmoduleCount(submoduleCount);
  return yield all(apps.map(app => fork(app.saga)));
}

function* fetchTx(txHash, loadOptions) {
  let result = yield* web3.inspectTransaction(txHash);
  debug("result %o", result);

  if (result.error) {
    return result.error;
  }

  //get addresses created/called during transaction
  debug("processing trace for addresses");
  let { calls, creations, selfdestructs } = yield* trace.processTrace(
    result.trace
  );
  //add in the address of the call itself (if a call)
  if (result.address && !calls.includes(result.address)) {
    calls.push(result.address);
  }

  //if a create, only add in address if it was successful
  if (result.binary && result.status && !(result.storageAddress in creations)) {
    creations[result.storageAddress] = result.binary;
  }

  let blockNumber = result.block.number.toString(); //a BN is not accepted
  let addresses = [...calls, ...selfdestructs, ...Object.keys(creations)];
  let nonCallStartIndex = calls.length;
  debug("obtaining binaries");
  let binaries = yield* web3.obtainBinaries(addresses, blockNumber);

  debug("recording instances");
  yield all(
    addresses.map((address, index) =>
      call(
        recordInstance,
        address,
        binaries[index],
        index >= nonCallStartIndex,
        creations[address] //may be undefined
      )
    )
  );

  debug("sending initial call");
  yield* evm.begin(result); //note: this must occur *before* the other ones!
  yield* sourcemapping.begin();
  yield* stacktrace.begin();
  if (!(yield select(session.status.lightMode))) {
    //full-mode-only modules
    yield* txlog.begin();
  }
  try {
    //finally, enable storage lookup.  We do this even in light mode, since
    //full mode might be set later, and we have to do it on loading the tx.
    //Ideally this would be done earlier, but in the current setup, it can't
    //occur until after evm.begin(), so it's here.
    yield* evm.setStorageLookup(loadOptions.storageLookup);
  } catch (error) {
    //remember, this function *returns* errors rather than throwing them!
    return error;
  }
}

function* recordContexts(contexts) {
  for (const context of Object.values(contexts)) {
    yield* evm.addContext(context);
  }
}

function* recordSources(sources) {
  yield* sourcemapping.addSources(sources);
}

function* recordContracts(contracts) {
  yield* data.addContracts(contracts);
}

//creationBinary can be omitted; should only be used for creations
function* recordInstance(
  address,
  binary,
  affectedInstanceOnly,
  creationBinary
) {
  yield* evm.addAffectedInstance(address, binary, creationBinary);
  if (!affectedInstanceOnly) {
    //add it as a real codex instance
    yield* evm.addInstance(address, binary);
  }
}

function* ready() {
  yield put(actions.ready());
}

function* error(err) {
  yield put(actions.error(err));
}

//we'll just unload all modules regardless of which ones are currently present...
export function* unload() {
  debug("unloading");
  yield* data.reset();
  yield* sourcemapping.unload();
  yield* evm.unload();
  yield* trace.unload();
  yield* stacktrace.unload();
  yield* txlog.unload();
  yield put(actions.unloadTransaction());
}

//note that load takes an action as its argument, which is why it's separate
//from processTransaction
function* load({ txHash, options }) {
  yield* processTransaction(txHash, options);
}
