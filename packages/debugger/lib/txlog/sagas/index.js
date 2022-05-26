import debugModule from "debug";
const debug = debugModule("debugger:txlog:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import { prefixName } from "lib/helpers";
import * as Codec from "@truffle/codec";

import * as actions from "../actions";
import { TICK } from "lib/trace/actions";
import * as trace from "lib/trace/sagas";
import * as data from "lib/data/sagas";

import txlog from "../selectors";

function* tickSaga() {
  yield* updateTransactionLogSaga();
  yield* trace.signalTickSagaCompletion();
}

function* updateTransactionLogSaga() {
  const pointer = yield select(txlog.current.pointer); //log pointer, not AST pointer
  if (yield select(txlog.current.isHalting)) {
    //note that we process this case first so that it overrides the others!
    const newPointer = yield select(txlog.current.externalReturnPointer);
    const status = yield select(txlog.current.returnStatus);
    if (status) {
      if (yield select(txlog.current.isSelfDestruct)) {
        const beneficiary = yield select(txlog.current.beneficiary);
        //note: this selector returns null for a value-destroying selfdestruct
        debug("sd: %o %o", pointer, newPointer);
        yield put(actions.selfdestruct(pointer, newPointer, beneficiary));
      } else {
        const decodings = yield* data.decodeReturnValue();
        const rawData = yield select(txlog.current.returnData);
        debug("external return: %o %o", pointer, newPointer);
        yield put(
          actions.externalReturn(pointer, newPointer, decodings, rawData)
        );
      }
    } else {
      const error = (yield* data.decodeReturnValue())[0];
      debug("revert: %o %o", pointer, newPointer);
      yield put(actions.revert(pointer, newPointer, error));
    }
  } else if (yield select(txlog.current.isJump)) {
    const jumpDirection = yield select(txlog.current.jumpDirection);
    if (jumpDirection === "i") {
      const internal = yield select(txlog.next.inInternalSourceOrYul); //don't log jumps into internal sources or Yul
      if (!internal) {
        //we don't do any decoding/fn identification here because that's handled by
        //the function identification case
        if (!(yield select(txlog.current.waitingForInternalCallToAbsorb))) {
          const newPointer = yield select(txlog.current.nextActionPointer);
          debug("internal call: %o %o", pointer, newPointer);
          yield put(actions.internalCall(pointer, newPointer));
        } else {
          debug("absorbed call: %o", pointer);
          yield put(actions.absorbedCall(pointer));
        }
      }
    } else if (jumpDirection === "o") {
      const internal = yield select(txlog.current.inInternalSourceOrYul); //don't log jumps out of internal sources or Yul
      const astMatchesTxLog = yield select(
        txlog.current.currentFunctionIsAsExpected
      ); //don't log returns from the wrong function...?
      //(I've added this second check due to a strange case Amal found, hopefully this doesn't screw anything up)
      if (!internal && astMatchesTxLog) {
        //in this case, we have to do decoding & fn identification
        const newPointer = yield select(txlog.current.internalReturnPointer);
        const outputAllocations = yield select(
          txlog.current.outputParameterAllocations
        );
        if (outputAllocations) {
          const compilationId = yield select(txlog.current.compilationId);
          //can't do a yield* inside a map, have to do this loop manually
          let variables = [];
          for (let { name, definition, pointer } of outputAllocations) {
            name = name ? name : undefined; //replace "" with undefined
            const decodedValue = yield* data.decode(
              definition,
              pointer,
              compilationId
            );
            variables.push({ name, value: decodedValue });
          }
          debug("internal return: %o %o", pointer, newPointer);
          yield put(actions.internalReturn(pointer, newPointer, variables));
        } else {
          debug("internal return: %o %o", pointer, newPointer);
          yield put(actions.internalReturn(pointer, newPointer, undefined)); //I guess?
        }
      }
    }
  } else if (yield select(txlog.current.isCall)) {
    const newPointer = yield select(txlog.current.nextActionPointer);
    const address = yield select(txlog.current.callAddress);
    const value = yield select(txlog.current.callValue);
    //distinguishing DELEGATECALL vs CALLCODE seems unnecessary here
    const isDelegate = yield select(txlog.current.isDelegateCallBroad);
    //we need to determine what kind of call this is.
    //we'll sort them into: function, constructor, message, library
    //(library is a placeholder to be replaced later)
    const context = yield select(txlog.current.callContext);
    const calldata = yield select(txlog.current.callData);
    const instant = yield select(txlog.current.isInstantCallOrCreate);
    const kind = callKind(context, calldata, instant);
    const absorb = yield select(txlog.current.absorbNextInternalCall);
    const decoding = yield* data.decodeCall();
    if (instant) {
      const status = yield select(txlog.current.returnStatus);
      debug("instacall: %o %o", pointer, newPointer);
      yield put(
        actions.instantExternalCall(
          pointer,
          newPointer, //note: doesn't actually change the current pointer
          address,
          context,
          value,
          isDelegate,
          kind,
          decoding,
          calldata,
          absorb,
          status
        )
      );
    } else {
      debug("external call: %o %o", pointer, newPointer);
      yield put(
        actions.externalCall(
          pointer,
          newPointer,
          address,
          context,
          value,
          isDelegate,
          kind,
          decoding,
          calldata,
          absorb
        )
      );
    }
  } else if (yield select(txlog.current.isCreate)) {
    const newPointer = yield select(txlog.current.nextActionPointer);
    const address = yield select(txlog.current.createdAddress);
    const context = yield select(txlog.current.callContext);
    const value = yield select(txlog.current.createValue);
    const salt = yield select(txlog.current.salt); //is null for an ordinary create
    const instant = yield select(txlog.current.isInstantCallOrCreate);
    const binary = yield select(txlog.current.createBinary);
    const decoding = yield* data.decodeCall();
    if (instant) {
      const status = yield select(txlog.current.returnStatus);
      debug("instacreate: %o %o", pointer, newPointer);
      yield put(
        actions.instantCreate(
          pointer,
          newPointer, //note: doesn't actually change the current pointer
          address,
          context,
          value,
          salt,
          decoding,
          binary,
          status
        )
      );
    } else {
      debug("create: %o %o", pointer, newPointer);
      yield put(
        actions.create(
          pointer,
          newPointer,
          address,
          context,
          value,
          salt,
          decoding,
          binary
        )
      );
    }
  } else if (yield select(txlog.current.isLog)) {
    const decoding = (yield* data.decodeLog())[0]; //just assume first decoding is correct
    //(note: because we know the event ID, there should typically only be one decoding)
    const newPointer = yield select(txlog.current.nextActionPointer);
    yield put(actions.logEvent(pointer, newPointer, decoding));
  } else if (yield select(txlog.current.onFunctionDefinition)) {
    if (yield select(txlog.current.waitingForFunctionDefinition)) {
      debug("identifying");
      const inputAllocations = yield select(
        txlog.current.inputParameterAllocations
      );
      debug("inputAllocations: %O", inputAllocations);
      if (inputAllocations) {
        const functionNode = yield select(txlog.current.astNode);
        const contractNode = yield select(txlog.current.contract);
        const compilationId = yield select(txlog.current.compilationId);
        //can't do a yield* inside a map, have to do this loop manually
        let variables = [];
        for (let { name, definition, pointer } of inputAllocations) {
          const decodedValue = yield* data.decode(
            definition,
            pointer,
            compilationId
          );
          variables.push({ name, value: decodedValue });
        }
        debug("identify: %o", pointer);
        yield put(
          actions.identifyFunctionCall(
            pointer,
            functionNode,
            contractNode,
            variables
          )
        );
      }
    }
  }
}

function callKind(context, calldata, instant) {
  if (context) {
    if (context.contractKind === "library") {
      return instant ? "message" : "library";
      //for an instant return, just get it out of the way and set it to
      //message rather than leaving it open (it'll get resolved in favor
      //of message by our criteria)
    } else {
      const abi = context.abi;
      const selector = calldata
        .slice(0, 2 + 2 * Codec.Evm.Utils.SELECTOR_SIZE)
        .padEnd("00", 2 + 2 * Codec.Evm.Utils.SELECTOR_SIZE);
      debug("selector: %s", selector);
      if (abi && selector in abi) {
        return "function";
      }
    }
  }
  return "message";
}

export function* reset() {
  const initialCall = yield select(txlog.transaction.initialCall);
  yield put(actions.reset());
  yield put(initialCall);
}

export function* unload() {
  yield put(actions.unloadTransaction());
}

export function* begin() {
  const pointer = yield select(txlog.current.pointer);
  const newPointer = yield select(txlog.current.nextActionPointer);
  const origin = yield select(txlog.transaction.origin);
  debug("origin: %o", pointer);
  yield put(actions.recordOrigin(pointer, origin));
  const {
    address,
    binary,
    storageAddress,
    value,
    data: calldata
  } = yield select(txlog.current.call);
  const context = yield select(txlog.current.context);
  //note: there was an instant check here (based on checking if there are no
  //trace steps) but I took it out, because even though having no trace steps
  //is essentially an insta-call, the debugger doesn't treat it that way (it
  //will see the return later), so we shouldn't here either
  const decoding = yield* data.decodeCall(true); //pass flag to decode *current* call
  if (address) {
    const kind = callKind(context, calldata, false); //no insta-calls here!
    const absorb = yield select(txlog.transaction.absorbFirstInternalCall);
    debug("initial call: %o %o", pointer, newPointer);
    yield put(
      actions.externalCall(
        pointer,
        newPointer,
        address,
        context,
        value,
        false, //initial call is never delegate
        kind,
        decoding,
        calldata,
        absorb
      )
    );
  } else {
    debug("initial create: %o %o", pointer, newPointer);
    yield put(
      actions.create(
        pointer,
        newPointer,
        storageAddress,
        context,
        value,
        null, //initial create never has salt
        decoding,
        binary
      )
    );
  }
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("txlog", saga);
