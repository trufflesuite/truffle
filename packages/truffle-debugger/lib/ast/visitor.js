import debugModule from "debug";
const debug = debugModule("debugger:ast:visitor");

import { call, takeEvery, put } from "redux-saga/effects";

import * as actions from "./actions";
import * as dataActions from "../data/actions";

export function *walk(context, node, pointer = "", parentId = null) {
  yield put(actions.enter(pointer, node, context, parentId));
  debug("walking %o %o", pointer, node);

  if (node instanceof Array) {
    for (let [i, child] of node.entries()) {
      yield call(walk, context, child, `${pointer}/${i}`, parentId);
    }
  } else if (node instanceof Object) {
    for (let [key, child] of Object.entries(node)) {
      yield call(walk, context, child, `${pointer}/${key}`, node.id);
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

export function *recordId({context, node, pointer, parentId}) {
  debug("recording scope: %o %o", node.id, pointer);
  yield put(dataActions.scope(context, node.id, pointer, parentId));
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
