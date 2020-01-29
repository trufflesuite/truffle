import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { all, call, select } from "redux-saga/effects";

import * as data from "lib/data/sagas";

import ast from "../selectors";

function* walk(sourceId, node, pointer = "", parentId = null) {
  debug("walking %o %o", pointer, node);

  yield* handleEnter(sourceId, node, pointer, parentId);

  if (node instanceof Array) {
    for (let [i, child] of node.entries()) {
      yield call(walk, sourceId, child, `${pointer}/${i}`, parentId);
    }
  } else if (node instanceof Object) {
    for (let [key, child] of Object.entries(node)) {
      yield call(walk, sourceId, child, `${pointer}/${key}`, node.id);
    }
  }

  yield* handleExit(sourceId, node, pointer);
}

function* handleEnter(sourceId, node, pointer, parentId) {
  if (!(node instanceof Object)) {
    return;
  }

  debug("entering %s", pointer);

  if (node.id !== undefined) {
    debug("%s recording scope %s", pointer, node.id);
    yield* data.scope(node.id, pointer, parentId, sourceId);
  }

  switch (node.nodeType) {
    case "VariableDeclaration":
      debug("%s recording variable %o", pointer, node);
      yield* data.declare(node);
      break;
    case "ContractDefinition":
    case "StructDefinition":
    case "EnumDefinition":
      yield* data.defineType(node);
      break;
  }
}

function* handleExit(sourceId, node, pointer) {
  debug("exiting %s", pointer);

  // no-op right now
}

export function* visitAll() {
  let sources = yield select(ast.views.sources);

  yield all(
    Object.entries(sources)
      .filter(([_, source]) => source.ast)
      .map(([id, { ast }]) => call(walk, id, ast))
  );

  debug("done visiting");
}
