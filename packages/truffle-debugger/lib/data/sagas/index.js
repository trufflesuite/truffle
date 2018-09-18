import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";
import jsonpointer from "json-pointer";

import { prefixName } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";

import data from "../selectors";
import solidity from "../../solidity/selectors";

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

  let decode = yield select(data.views.decoder);
  let scopes = yield select(data.info.scopes);
  let definitions = yield select(data.views.scopes.inlined);
  let currentAssignments = yield select(data.proc.assignments);
  let mappingKeys = yield select(data.proc.mappingKeys); //just for debugging
  let curDepth = yield select(solidity.current.functionDepth); //for pairing with ids

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
        .map( (id, i) => ({ [curDepth + ":" + id]: {"stack": top - i} }) )
		//depth may be off by 1 but it doesn't matter
        .reduce( (acc, assignment) => Object.assign(acc, assignment), {} );
      debug("Function definition case");
      debug("currentAssignments %O", currentAssignments);
      debug("mappingKeys %O", mappingKeys);
      debug("assignments %O", assignments);

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
          .map( ([id, storage]) => ({
            ["0:" + id]: { //using depth 0 to indicate storage
              ...(currentAssignments["0:" + id] || { ref: {} }).ref,
              storage
            }
          }) )
      );
      debug("Contract definition case");
      debug("currentAssignments %O", currentAssignments);
      debug("mappingKeys %O", mappingKeys);
      debug("assignments %O", assignments);

      yield put(actions.assign(treeId, assignments));
      break;

    case "VariableDeclaration":
      let varId = jsonpointer.get(tree, pointer).id;
      debug("Variable declaration case");
      debug("currentAssignments %O", currentAssignments);
      debug("mappingKeys %O", mappingKeys);
      debug("curDepth %d varId %d",curDepth,varId);
      yield put(actions.assign(treeId, {
        [curDepth + ":" + varId]: {"stack": top}
      }));
      break;

    case "IndexAccess":
      // to track `mapping` types known indexes
      let {
        baseExpression: {
          id: baseId, //not currently used
          referencedDeclaration: baseDeclarationId,
        },
        indexExpression: {
          id: indexId,
        }
      } = node;

      let augDeclarationId = "0:" + baseDeclarationId; //augment w/0 for storage
      let augIndexId = curDepth + ":" + indexId;//for indices use depth as usual
      debug("Index access case");
      debug("currentAssignments %O", currentAssignments);
      debug("mappingKeys %O", mappingKeys);
      debug("augDeclarationId %s",augDeclarationId)
      debug("augIndexId %s",augIndexId)

      let baseAssignment = (currentAssignments[augDeclarationId] || {
        //mappings are always global
        ref: {}
      }).ref;
      debug("baseAssignment %O", baseAssignment);

      let baseDefinition = definitions[baseDeclarationId].definition;

      const indexAssignment = (currentAssignments[augIndexId] || {}).ref;
      debug("indexAssignment %O", indexAssignment);
      // HACK because string literal AST nodes are not sourcemapped to directly
      // value appears to be available in `node.indexExpression.hexValue`
      // [observed with solc v0.4.24]
      let indexValue;
      if (indexAssignment) {
        indexValue = decode(node.indexExpression, indexAssignment)
      } else if (utils.typeClass(node.indexExpression) == "stringliteral") {
        indexValue = decode(node.indexExpression, {
          "literal": utils.toBytes(node.indexExpression.hexValue)
        })
      }

      debug("index value %O", indexValue);
      if (indexValue != undefined) {
        yield put(actions.mapKey(augDeclarationId, indexValue));
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
      debug("mappingKeys %O", mappingKeys);
      debug("curDepth %d node.id %d",curDepth,node.id);
      yield put(actions.assign(treeId, {
        [curDepth + ":" + node.id]: { literal }
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
