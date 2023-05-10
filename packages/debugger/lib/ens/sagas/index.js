import debugModule from "debug";
const debug = debugModule("debugger:ens:sagas");

import { put, select } from "redux-saga/effects";

import * as actions from "../actions";
import * as web3 from "lib/web3/sagas";

import ens from "../selectors";

import { Conversion } from "@truffle/codec";

//note: name may be null
export function* reverseResolve(address) {
  debug("reverse resolving %s", address);
  const cache = yield select(ens.current.cache);
  if (address in cache) {
    debug("got cached %o", cache[address]);
    return cache[address];
  } else {
    let name = yield* web3.reverseEnsResolve(address); //may be null
    debug("got name %o", name);
    //now: do a forward resolve as a check
    if (name !== null) {
      debug("forward resolving %s", name);
      const checkAddress = yield* resolve(name);
      debug("got check address %o", checkAddress);
      if (checkAddress !== address) {
        //if forward resolution doesn't match, this name is no good!
        name = null;
      }
    }
    yield put(actions.record(address, name));
    debug("returning %o", name);
    return name;
  }
}

export function* resolve(name) {
  //we won't bother with a cache for this one
  return yield* web3.ensResolve(name);
}

//also may be null.
export function* reverseResolveAsBytes(address) {
  const name = yield* reverseResolve(address);
  if (name === null) {
    return null;
  }
  return Conversion.stringToBytes(name);
}
