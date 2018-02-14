import debugModule from "debug";
const debug = debugModule("debugger:ast:visitor");

import { call, takeEvery, put } from "redux-saga/effects";

import * as actions from "./actions";
import * as dataActions from "../data/actions";

export function *walk(context, node, pointer = "") {
  yield put(actions.enter(pointer, node, context));
  debug("walking %o %o", pointer, node);

  if (node instanceof Array) {
    for (let [i, child] of node.entries()) {
      yield call(walk, context, child, `${pointer}/${i}`);
    }
  } else if (node instanceof Object) {
    for (let [key, child] of Object.entries(node)) {
      yield call(walk, context, child, `${pointer}/${key}`);
    }
  }

  yield put(actions.exit(pointer, node, context));
}

export function *recordVariableDeclaration({context, node}) {
  debug("declaring variable: %o", node);
  yield put(dataActions.declare(context, node));
}

export function *variableDeclarationSaga() {
  const predicate = (action) => (
    action.type == actions.ENTER &&
    action.node instanceof Object &&
    action.node.nodeType == "VariableDeclaration"
  );

  yield takeEvery(predicate, recordVariableDeclaration);
}

export function *recordId({context, node, pointer}) {
  debug("recording scope: %o %o", node.id, pointer);
  yield put(dataActions.scope(context, node.id, pointer));
}

export function *idSaga() {
  const predicate = (action) => (
    action.type == actions.ENTER &&
    action.node instanceof Object &&
    action.node.id !== undefined
  );

  yield takeEvery(predicate, recordId);
}

export function *saga() {
  yield *idSaga();
  yield *variableDeclarationSaga();
}
