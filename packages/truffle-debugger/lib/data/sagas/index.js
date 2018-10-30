import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import jsonpointer from "json-pointer";

import { prefixName } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import data from "../selectors";
import solidity from "lib/solidity/selectors";

import { WORD_SIZE } from "lib/data/decode/utils";
import * as utils from "lib/data/decode/utils";

export function* scope(nodeId, pointer, parentId, sourceId) {
  yield put(actions.scope(nodeId, pointer, parentId, sourceId));
}

export function* declare(node) {
  yield put(actions.declare(node));
}

function* tickSaga() {
  let { tree, id: treeId, node, pointer } = yield select(data.views.ast);

  let decode = yield select(data.views.decoder);
  let scopes = yield select(data.info.scopes);
  let definitions = yield select(data.views.scopes.inlined);
  let currentAssignments = yield select(data.proc.assignments);
  let currentDepth = yield select(solidity.current.functionDepth);

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
      parameters = node.parameters.parameters.map(
        (p, i) => `${pointer}/parameters/parameters/${i}`
      );

      returnParameters = node.returnParameters.parameters.map(
        (p, i) => `${pointer}/returnParameters/parameters/${i}`
      );

      assignments = returnParameters
        .concat(parameters)
        .reverse()
        .map(pointer => jsonpointer.get(tree, pointer).id)
        //note: depth may be off by 1 but it doesn't matter
        .map((id, i) => ({
          [utils.augmentWithDepth(id, currentDepth)]: { stack: top - i }
        }))
        .reduce((acc, assignment) => Object.assign(acc, assignment), {});
      debug("Function definition case");
      debug("currentAssignments %O", currentAssignments);
      debug("assignments %O", assignments);

      yield put(actions.assign(treeId, assignments));
      break;

    case "ContractDefinition":
      let storageVars = scopes[node.id].variables || [];
      let slot = 0;
      let index = WORD_SIZE - 1; // cause lower-order
      debug("storage vars %o", storageVars);

      let allocation = utils.allocateDeclarations(storageVars, definitions);
      debug("Contract definition case");
      debug("allocation %O", allocation);
      assignments = Object.assign(
        {},
        ...Object.entries(allocation.children).map(([id, storage]) => ({
          [utils.augmentWithDepth(id)]: {
            ...(currentAssignments[utils.augmentWithDepth(id)] || { ref: {} })
              .ref,
            storage
          }
        }))
      );
      debug("currentAssignments %O", currentAssignments);
      debug("assignments %O", assignments);

      yield put(actions.assign(treeId, assignments));
      break;

    case "VariableDeclaration":
      let varId = jsonpointer.get(tree, pointer).id;
      debug("Variable declaration case");
      debug("currentAssignments %O", currentAssignments);
      debug("currentDepth %d varId %d", currentDepth, varId);
      yield put(
        actions.assign(treeId, {
          [utils.augmentWithDepth(varId, currentDepth)]: { stack: top }
        })
      );
      break;

    case "IndexAccess":
      // to track `mapping` types known indexes
      let {
        baseExpression: { referencedDeclaration: baseDeclarationId },
        indexExpression: { id: indexId }
      } = node;
      //augment declaration Id w/0 to indicate storage
      let augmentedDeclarationId = utils.augmentWithDepth(baseDeclarationId);
      //indices, meanwhile, use depth as usual
      let augmentedIndexId = utils.augmentWithDepth(indexId, currentDepth);
      debug("Index access case");
      debug("currentAssignments %O", currentAssignments);
      debug("augmentedDeclarationId %s", augmentedDeclarationId);
      debug("augmentedIndexId %s", augmentedIndexId);

      let baseAssignment = (
        currentAssignments[augmentedDeclarationId] || {
          //mappings are always global
          ref: {}
        }
      ).ref;
      debug("baseAssignment %O", baseAssignment);

      let baseDefinition = definitions[baseDeclarationId].definition;

      const indexAssignment = (currentAssignments[augmentedIndexId] || {}).ref;
      debug("indexAssignment %O", indexAssignment);
      // HACK because string literal AST nodes are not sourcemapped to directly
      // value appears to be available in `node.indexExpression.hexValue`
      // [observed with solc v0.4.24]
      let indexValue;
      if (indexAssignment) {
        indexValue = decode(node.indexExpression, indexAssignment);
      } else if (utils.typeClass(node.indexExpression) == "stringliteral") {
        indexValue = decode(node.indexExpression, {
          literal: utils.toBytes(node.indexExpression.hexValue)
        });
      }

      debug("index value %O", indexValue);
      if (indexValue != undefined) {
        yield put(actions.mapKey(augmentedDeclarationId, indexValue));
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

      debug("default case");
      debug("currentAssignments %O", currentAssignments);
      debug("currentDepth %d node.id %d", currentDepth, node.id);
      yield put(
        actions.assign(treeId, {
          [utils.augmentWithDepth(node.id, currentDepth)]: { literal }
        })
      );
      break;
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* saga() {
  yield takeEvery(TICK, function*() {
    try {
      yield* tickSaga();
    } catch (e) {
      debug(e);
    }
  });
}

export default prefixName("data", saga);
