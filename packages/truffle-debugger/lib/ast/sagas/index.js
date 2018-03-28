import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { all, call, race, fork, join, take, takeEvery, put, select } from "redux-saga/effects";

import { prefixName } from "lib/helpers";

import * as data from "lib/data/sagas";

import * as actions from "../actions";

import ast from "../selectors";


function *walk(sourceId, node, pointer = "", parentId = null) {
  debug("walking %o %o", pointer, node);

  yield *handleEnter(sourceId, node, pointer, parentId);

  if (node instanceof Array) {
    for (let [i, child] of node.entries()) {
      yield call(walk, sourceId, child, `${pointer}/${i}`, parentId);
    }
  } else if (node instanceof Object) {
    for (let [key, child] of Object.entries(node)) {
      yield call(walk, sourceId, child, `${pointer}/${key}`, node.id);
    }
  }

  yield *handleExit(sourceId, node, pointer);
}

function *handleEnter(sourceId, node, pointer, parentId) {
  if (!(node instanceof Object)) {
    return;
  }

  debug("entering %s", pointer);

  if (node.id !== undefined) {
    debug("%s recording scope %s", pointer, node.id);
    yield *data.scope(node.id, pointer, parentId, sourceId);
  }

  switch (node.nodeType) {
    case "VariableDeclaration":
      debug("%s recording variable %o", pointer, node);
      yield *data.declare(node);
      break;
  }
}

function *handleExit(sourceId, node, pointer) {
  debug("exiting %s", pointer);

  // no-op right now
}

function *walkSaga({sourceId, ast}) {
  yield walk(sourceId, ast);
}

export function *visitAll(idx) {
  let sources = yield select(ast.views.sources);

  let tasks = yield all(
    Object.entries(sources)
      .filter( ([id, {ast}]) => !!ast )
      .map( ([id, {ast}]) => fork( () => put(actions.visit(id, ast))) )
  )

  if (tasks.length > 0) {
    yield join(...tasks);
  }

  yield put(actions.doneVisiting());
}

export function* saga() {
  yield race({
    visitor: takeEvery(actions.VISIT, walkSaga),
    done: take(actions.DONE_VISITING)
  });
}

export default prefixName("ast", saga);
