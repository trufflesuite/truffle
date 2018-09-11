import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import jsonpointer from "json-pointer";

import { prefixName } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import data from "../selectors";

import { utils } from "../../../../truffle-decoder/dist/interface"; // TODO: use npm package

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

  let decode = yield select(data.views.decoder);
  let scopes = yield select(data.info.scopes);
  let definitions = yield select(data.views.scopes.inlined);
  let currentAssignments = yield select(data.proc.assignments);

  let stack = yield select(data.next.state.stack);
  if (!stack) {
    return;
  }

  let top = stack.length - 1;
  var parameters, returnParameters, assignments, storageVars;

  if (!node) {
    return;
  }

  // stack is only ready for interpretation after the last step of each
  // source range
  //
  // the data module always looks at the result of a particular opcode
  // (i.e., the following trace step's stack/memory/storage), so this
  // asserts that the _current_ operation is the final one before
  // proceeding
  if (!(yield select(data.views.atLastInstructionForSourceRange))) {
    return;
  }

  switch (node.nodeType) {

    case "FunctionDefinition":
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

      let allocation = utils.Allocation.allocateDeclarations(storageVars, definitions);
      assignments = Object.assign(
        {}, ...Object.entries(allocation.children)
          .map( ([id, storage]) => ({
            [id]: {
              ...(currentAssignments[id] || { ref: {} }).ref,
              storage
            }
          }) )
      );
      debug("assignments %O", assignments);

      yield put(actions.assign(treeId, assignments));
      break;

    case "VariableDeclaration":
      yield put(actions.assign(treeId, {
        [jsonpointer.get(tree, pointer).id]: {"stack": top}
      }));
      break;

    case "IndexAccess":
      // to track `mapping` types known indexes
      let {
        baseExpression: {
          id: baseId,
          referencedDeclaration: baseDeclarationId,
        },
        indexExpression: {
          id: indexId,
        }
      } = node;

      let baseAssignment = (currentAssignments[baseDeclarationId] || {
        ref: {}
      }).ref;
      debug("baseAssignment %O", baseAssignment);

      let baseDefinition = definitions[baseDeclarationId].definition;

      const indexAssignment = (currentAssignments[indexId] || {}).ref;
      debug("indexAssignment %O", indexAssignment);
      // HACK because string literal AST nodes are not sourcemapped to directly
      // value appears to be available in `node.indexExpression.hexValue`
      // [observed with solc v0.4.24]
      let indexValue;
      if (indexAssignment) {
        indexValue = decode(node.indexExpression, indexAssignment)
      } else if (utils.Definition.typeClass(node.indexExpression) == "stringliteral") {
        indexValue = decode(node.indexExpression, {
          "literal": utils.Conversion.toBytes(node.indexExpression.hexValue)
        })
      }

      debug("index value %O", indexValue);
      if (indexValue != undefined) {
        yield put(actions.mapKey(baseDeclarationId, indexValue));
      }

      break;

    case "Assignment":
      break;

    default:
      if (node.typeDescriptions == undefined) {
        break;
      }

      debug("decoding expression value %O", node.typeDescriptions);
      let literal = stack[top];

      yield put(actions.assign(treeId, {
        [node.id]: { literal }
      }));
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
