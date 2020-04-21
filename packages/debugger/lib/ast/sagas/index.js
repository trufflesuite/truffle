import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { all, call, select } from "redux-saga/effects";

import * as data from "lib/data/sagas";

import ast from "../selectors";

import flatten from "lodash.flatten";

function* walk(compilationId, sourceId, node, pointer = "", parentId = null) {
  debug("walking %d %o %o", sourceId, pointer, node);

  yield* handleEnter(compilationId, sourceId, node, pointer, parentId);

  if (node instanceof Array) {
    for (let [i, child] of node.entries()) {
      yield* walk(compilationId, sourceId, child, `${pointer}/${i}`, parentId);
    }
  } else if (node instanceof Object) {
    for (let [key, child] of Object.entries(node)) {
      yield* walk(compilationId, sourceId, child, `${pointer}/${key}`, node.id);
    }
  }

  yield* handleExit(compilationId, sourceId, node, pointer);
}

function* handleEnter(compilationId, sourceId, node, pointer, parentId) {
  debug("entering %d %s", sourceId, pointer);

  if (!(node instanceof Object)) {
    return;
  }

  if (node.id !== undefined) {
    debug("%s recording scope %s", pointer, node.id);
    yield* data.scope(node.id, pointer, parentId, sourceId, compilationId);
  }

  switch (node.nodeType) {
    case "VariableDeclaration":
      debug("%s recording variable %o", pointer, node);
      yield* data.declare(node, compilationId);
      break;
    case "ContractDefinition":
    case "StructDefinition":
    case "EnumDefinition":
      debug("%s recording type %o", pointer, node);
      yield* data.defineType(node, compilationId);
      break;
  }
}

function* handleExit(compilationId, sourceId, node, pointer) {
  debug("exiting %d %s", sourceId, pointer);

  // no-op right now
}

export function* visitAll() {
  let compilations = yield select(ast.views.sources);

  let sources = flatten(
    Object.values(compilations).map(({ byId }) => byId)
  ).filter(x => x);

  yield all(
    sources
      .filter(({ ast }) => ast)
      .map(({ ast, id, compilationId }) => call(walk, compilationId, id, ast))
  );

  debug("done visiting");
}
