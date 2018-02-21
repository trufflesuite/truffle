import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import jsonpointer from "json-pointer";

import { TICK } from "lib/trace/actions";
import * as actions from "./actions";

import ast from "lib/ast/selectors";
import evm from "lib/evm/selectors";

function *tickSaga() {
  let tree = yield select(ast.current.tree);
  let treeId = yield select(ast.current.index);
  let node = yield select(ast.next.node);
  let pointer = yield select(ast.next.pointer);

  let state = yield select(evm.next.state);
  if (!state.stack) {
    return;
  }

  let top = state.stack.length - 1;

  switch (node.nodeType) {

    case "FunctionDefinition":
      let parameters = node.parameters.parameters
        .map( (p, i) => `${pointer}/parameters/parameters/${i}` );

      let returnParameters = node.returnParameters.parameters
        .map( (p, i) => `${pointer}/returnParameters/parameters/${i}` );

      let assignments = returnParameters.concat(parameters).reverse()
        .map( (pointer) => jsonpointer.get(tree, pointer).id )
        .map( (id, i) => ({ [id]: top - i }) )
        .reduce( (acc, assignment) => Object.assign(acc, assignment), {} );

      yield put(actions.assign(treeId, assignments));
      break;

    case "VariableDeclaration":
      yield put(actions.assign(treeId, {
        [jsonpointer.get(tree, pointer).id]: top
      }));

    default:
      break;
  }
}

export default function* saga () {
  yield takeEvery(TICK, tickSaga);
}
