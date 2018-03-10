import debugModule from "debug";
const debug = debugModule("debugger:context:sagas");

import { put, select } from 'redux-saga/effects';

import * as actions from "../actions";
import context from "../selectors";

export function *addOrMerge(newContext) {
  let binaryIndexes = yield select(context.indexBy.binary);

  let index = binaryIndexes(newContext.binary);
  if (index !== undefined) {
    // existing context, merge
    yield put(actions.mergeContext(index, newContext))

  } else {
    // new
    yield put(actions.addContext(newContext));
  }
}
