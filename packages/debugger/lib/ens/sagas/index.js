import debugModule from "debug";
const debug = debugModule("debugger:ens:sagas");

import { put, select } from "redux-saga/effects";

import * as actions from "../actions";
import * as web3 from "lib/web3/sagas";

import ens from "../selectors";

import { Conversion } from "@truffle/codec";

//note: name may be null
export function* reverseResolve(address) {
  const cache = yield select(ens.current.cache);
  if (address in cache) {
    return cache[address];
  } else {
    const name = yield* web3.reverseEnsResolve(address);
    yield put(actions.record(address, name));
    return name;
  }
}

//also may be null.  note: swallows errors! we don't
//want this to throw!
export function* reverseResolveAsBytes(address) {
  const name = yield* reverseResolve(address);
  if (name === null) {
    return null;
  }
  try {
    return Conversion.stringToBytes(address);
  } catch {
    return null;
  }
}
