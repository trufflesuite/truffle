import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import jsonpointer from "json-pointer";

import { prefixName } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import data from "../selectors";

import { WORD_SIZE } from "lib/data/decode/utils";
import * as utils from "lib/data/decode/utils";

export function *scope(nodeId, pointer, parentId, sourceId) {
  yield put(actions.scope(nodeId, pointer, parentId, sourceId));
}

export function *declare(node) {
  yield put(actions.declare(node));
}

function *tickSaga() {
  let {
    tree,
    id: treeId,
    node,
    pointer
  } = yield select(data.views.ast);

  let scopes = yield select(data.info.scopes);
  let definitions = yield select(data.views.scopes.inlined);

  let stack = yield select(data.next.state.stack);
  if (!stack) {
    return;
  }

  let top = stack.length - 1;
  var parameters, returnParameters, assignments, storageVars;

  if (!node) {
    return;
  }

  switch (node.nodeType) {

    case "FunctionDefinition":
      // stack is only ready for interpretation after the last step of each
      // source range
      //
      // the data module always looks at the result of a particular opcode
      // (i.e., the following trace step's stack/memory/storage), so this
      // asserts that the _current_ operation is the final one before
      // proceeding
      if (!(yield select(data.views.atLastInstructionForSourceRange))) {
        break;
      }

      parameters = node.parameters.parameters
        .map( (p, i) => `${pointer}/parameters/parameters/${i}` );

      returnParameters = node.returnParameters.parameters
        .map( (p, i) => `${pointer}/returnParameters/parameters/${i}` );

      assignments = returnParameters.concat(parameters).reverse()
        .map( (pointer) => jsonpointer.get(tree, pointer).id )
        .map( (id, i) => ({ [id]: {"stack": top - i} }) )
        .reduce( (acc, assignment) => Object.assign(acc, assignment), {} );

      yield put(actions.assign(treeId, assignments));
      break;

    case "ContractDefinition":
      let storageVars = scopes[node.id].variables || [];
      let slot = 0;
      let index = WORD_SIZE - 1;  // cause lower-order
      debug("storage vars %o", storageVars);

      let allocation = utils.allocateDeclarations(storageVars, definitions);
      assignments = Object.assign(
        {}, ...Object.entries(allocation.children)
          .map( ([id, storage]) => ({ [id]: {storage} }) )
      );
      debug("assignments %O", assignments);

      yield put(actions.assign(treeId, assignments));
      break;

    case "VariableDeclaration":
      yield put(actions.assign(treeId, {
        [jsonpointer.get(tree, pointer).id]: {"stack": top}
      }));

    default:
      break;
  }
}

export function* saga () {
  yield takeEvery(TICK, function* () {
    try {
      yield *tickSaga();
    } catch (e) {
      debug(e);
    }
  });
}

export default prefixName("data", saga);
