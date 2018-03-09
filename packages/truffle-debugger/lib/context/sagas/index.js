import debugModule from "debug";
const debug = debugModule("debugger:context:sagas");

import { put, select } from 'redux-saga/effects';

import * as actions from "../actions";
import context from "../selectors";

export function *addOrMerge(newContext) {
  debug("inside addOrMerge %o", newContext.binary);
  let binaryIndexes = yield select(context.indexBy.binary);

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
