import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { all, call, race, fork, join, take, takeEvery, put, select } from "redux-saga/effects";

import * as data from "lib/data/sagas";

import * as actions from "../actions";

import ast from "../selectors";


export function *walk(context, node, pointer = "", parentId = null) {
  debug("walking %o %o", pointer, node);

  yield *handleEnter(context, node, pointer, parentId);

  if (node instanceof Array) {
    for (let [i, child] of node.entries()) {
      yield call(walk, context, child, `${pointer}/${i}`, parentId);
    }
  } else if (node instanceof Object) {
    for (let [key, child] of Object.entries(node)) {
      yield call(walk, context, child, `${pointer}/${key}`, node.id);
    }
  }

  yield *handleExit(context, node, pointer);
}

export function *handleEnter(context, node, pointer, parentId) {
  if (!(node instanceof Object)) {
    return;
  }

  debug("entering %s", pointer);

  if (node.id !== undefined) {
    debug("%s recording scope %s", pointer, node.id);
    yield *data.scope(context, node.id, pointer, parentId);
  }

  switch (node.type) {
    case "VariableDeclaration":
      debug("%s recording variable %o", pointer, node);
      yield *data.declare(context, node);
      break;
  }
}

export function *handleExit(context, node, pointer) {
  debug("exiting %s", pointer);

  // no-op right now
}

export function *walkSaga({context, ast}) {
  yield walk(context, ast);
}

export function *visitAll(idx) {
  let contexts = yield select(ast.views.contexts);

  let tasks = yield all(
    contexts.map((context, idx) => [context, idx])
      .filter( ([{ast}]) => !!ast )
      .map( ([{ast}, idx]) => fork( () => put(actions.visit(idx, ast))) )
  )

  if (tasks.length > 0) {
    yield join(...tasks);
  }

  yield put(actions.doneVisiting());
}

export default function* saga() {
  yield race({
    visitor: takeEvery(actions.VISIT, walkSaga),
    done: take(actions.DONE_VISITING)
  });
}
