import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { all, call, race, fork, join, take, takeEvery, put, select } from "redux-saga/effects";

import * as actions from "../actions";
import * as dataActions from "lib/data/actions";  // TODO remove

import context from "lib/context/selectors";  // TODO remove


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
    yield put(dataActions.scope(context, node.id, pointer, parentId));
  }

  switch (node.type) {
    case "VariableDeclaration":
      debug("%s recording variable %o", pointer, node);
      yield put(dataActions.declare(context, node));
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

export function *visitAll(idx, ast) {
  let contexts = yield select(context.list);

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
