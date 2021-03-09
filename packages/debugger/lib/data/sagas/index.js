import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";

import {
  prefixName,
  stableKeccak256,
  makeAssignment,
  makePath
} from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";
import * as trace from "lib/trace/sagas";
import * as evm from "lib/evm/sagas";
import * as web3 from "lib/web3/sagas";

import data from "../selectors";

import sum from "lodash.sum";
import jsonpointer from "json-pointer";

import * as Codec from "@truffle/codec";
import BN from "bn.js";

export function* scope(nodeId, pointer, parentId, sourceIndex, sourceId) {
  yield put(actions.scope(nodeId, pointer, parentId, sourceIndex, sourceId));
}

export function* declare(node, sourceId) {
  yield put(actions.declare(node.name, node.id, node.scope, sourceId));
}

export function* yulScope(pointer, sourceIndex, sourceId, parentId) {
  yield put(
    //node ID is always undefined
    actions.scope(undefined, pointer, parentId, sourceIndex, sourceId)
  );
}

export function* yulDeclare(
  node,
  pointer,
  scopePointer,
  sourceIndex,
  sourceId
) {
  yield put(
    actions.declare(
      node.name,
      makePath(sourceIndex, pointer),
      makePath(sourceIndex, scopePointer),
      sourceId
    )
  );
}

export function* defineType(node, sourceId) {
  yield put(actions.defineType(node, sourceId));
}

function* tickSaga() {
  yield* variablesAndMappingsSaga();
  yield* trace.signalTickSagaCompletion();
}

export function* decode(definition, ref, compilationId) {
  const userDefinedTypes = yield select(data.views.userDefinedTypes);
  const state = yield select(data.current.state);
  const mappingKeys = yield select(data.views.mappingKeys);
  const allocations = yield select(data.info.allocations);
  const contexts = yield select(data.views.contexts);
  const currentContext = yield select(data.current.context);
  const internalFunctionsTable = yield select(
    data.current.functionsByProgramCounter
  );

  debug("definition: %o");
  debug("ref: %o");
  debug("compilationId: %s", compilationId);

  const ZERO_WORD = new Uint8Array(Codec.Evm.Utils.WORD_SIZE); //automatically filled with zeroes

  const decoder = Codec.decodeVariable(
    definition,
    ref,
    {
      userDefinedTypes,
      state,
      mappingKeys,
      allocations,
      contexts,
      currentContext,
      internalFunctionsTable
    },
    compilationId
  );

  debug("beginning decoding");
  let result = decoder.next();
  while (!result.done) {
    debug("request received");
    let request = result.value;
    let response;
    switch (request.type) {
      case "storage":
        //the debugger supplies all storage it knows at the beginning.
        //any storage it does not know is presumed to be zero.
        response = ZERO_WORD;
        break;
      case "code":
        response = yield* requestCode(request.address);
        break;
      default:
        debug("unrecognized request type!");
    }
    debug("sending response");
    result = decoder.next(response);
  }
  //at this point, result.value holds the final value
  debug("done decoding");
  debug("decoded value: %O", result.value);
  return result.value;
}

export function* decodeReturnValue() {
  const userDefinedTypes = yield select(data.views.userDefinedTypes);
  const state = yield select(data.next.state); //next state has the return data
  const allocations = yield select(data.info.allocations);
  const contexts = yield select(data.views.contexts);
  const status = yield select(data.current.returnStatus); //may be undefined
  const returnAllocation = yield select(data.current.returnAllocation); //may be null
  debug("returnAllocation: %O", returnAllocation);

  const decoder = Codec.decodeReturndata(
    {
      userDefinedTypes,
      state,
      allocations,
      contexts
    },
    returnAllocation,
    status
  );

  debug("beginning decoding");
  let result = decoder.next();
  while (!result.done) {
    debug("request received");
    let request = result.value;
    let response;
    switch (request.type) {
      //skip storage case, it won't happen here
      case "code":
        response = yield* requestCode(request.address);
        break;
      default:
        debug("unrecognized request type!");
    }
    debug("sending response");
    result = decoder.next(response);
  }
  //at this point, result.value holds the final value
  debug("done decoding");
  debug("decoded value: %O", result.value);
  return result.value;
}

//by default, decodes the call being made at the current step;
//if the flag is passed, instead decodes the call you're currently in
export function* decodeCall(decodeCurrent = false) {
  const isCall = yield select(data.current.isCall);
  const isCreate = yield select(data.current.isCreate);
  if (!isCall && !isCreate && !decodeCurrent) {
    return null;
  }
  const currentCallIsCreate = yield select(data.current.currentCallIsCreate);
  const userDefinedTypes = yield select(data.views.userDefinedTypes);
  let state = decodeCurrent
    ? yield select(data.current.state)
    : yield select(data.next.state);
  if (decodeCurrent && currentCallIsCreate) {
    //if we want to decode the *current* call, but the current call
    //is a creation, we had better pass in the code, not the calldata
    state = {
      ...state,
      calldata: state.code
    };
  }
  const allocations = yield select(data.info.allocations);
  debug("allocations: %O", allocations);
  const contexts = yield select(data.views.contexts);
  const context = decodeCurrent
    ? yield select(data.current.context)
    : yield select(data.current.callContext);
  const isConstructor = decodeCurrent
    ? yield select(data.current.currentCallIsCreate)
    : isCreate;

  const decoder = Codec.decodeCalldata(
    {
      state,
      userDefinedTypes,
      allocations,
      contexts,
      currentContext: context
    },
    isConstructor
  );

  debug("beginning decoding");
  let result = decoder.next();
  while (!result.done) {
    debug("request received");
    let request = result.value;
    let response;
    switch (request.type) {
      //skip storage case, it won't happen here
      case "code":
        response = yield* requestCode(request.address);
        break;
      default:
        debug("unrecognized request type!");
    }
    debug("sending response");
    result = decoder.next(response);
  }
  //at this point, result.value holds the final value
  debug("done decoding");
  return result.value;
}

//NOTE: calling this *can* add a new instance, which will not
//go away on a reset!  Yes, this is a little weird, but we
//decided this is OK for now
function* requestCode(address) {
  const NO_CODE = new Uint8Array(); //empty array
  const blockNumber = yield select(data.views.blockNumber);
  const instances = yield select(data.views.instances);

  if (address in instances) {
    return instances[address];
  } else if (address === Codec.Evm.Utils.ZERO_ADDRESS) {
    //HACK: to avoid displaying the zero address to the user as an
    //affected address just because they decoded a contract or external
    //function variable that hadn't been initialized yet, we give the
    //zero address's codelessness its own private cache :P
    return NO_CODE;
  } else {
    //I don't want to write a new web3 saga, so let's just use
    //obtainBinaries with a one-element array
    debug("fetching binary");
    let binary = (yield* web3.obtainBinaries([address], blockNumber))[0];
    debug("adding instance");
    yield* evm.addInstance(address, binary);
    return Codec.Conversion.toBytes(binary);
  }
}

function* variablesAndMappingsSaga() {
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

  let node = yield select(data.current.node);
  //can mutate in FunctionTypeName, YulLiteral, and YulIdentifier cases

  if (!node) {
    return;
  }

  //set up stack; see default case for what normally goes on
  let stack;
  switch (node.nodeType) {
    case "IndexAccess":
    case "MemberAccess":
      stack = yield select(data.nextUserStep.state.stack);
      //HACK: unfortunately, in some cases, data.next.state.stack gets the wrong
      //results due to unmapped/internal instructions intervening.  So, we get the stack at
      //the next mapped-to-user-source stack instead.  This is something of a hack and won't
      //work if we're about to change context, but it should work in the cases that
      //need it.
      break;
    case "YulFunctionCall":
      stack = yield select(data.nextOfSameDepth.state.stack);
      //if the step we're on is a CALL (or similar), as can happen with Yul,
      //we don't want to look at the stack on the *next* step, but rather
      //the step when it returns; hence this
      break;
    default:
      stack = yield select(data.next.state.stack); //note the use of next!
      //in this saga we are interested in the *results* of the current instruction
      //note that the decoder is still based on data.current.state; that's fine
      //though.  There's already a delay between when we record things off the
      //stack and when we decode them, after all.  Basically, nothing serious
      //should happen after an index node but before the index access node that
      //would cause storage, memory, or calldata to change, meaning that even if
      //the literal we recorded was a pointer, it will still be valid at the time
      //we use it.  (The other literals we make use of, for the base expressions,
      //are not decoded, so no potential mismatch there would be relevant anyway.)
      break;
  }

  if (!stack) {
    //note: should only happen in YulFunctionCall case
    return;
  }

  const top = stack.length - 1;

  //set up other variables
  let pointer = yield select(data.current.pointer); //can mutate in YulLiteral and YulIdentifier cases
  const currentDepth = yield select(data.current.functionDepth);
  const modifierDepth = yield select(data.current.modifierDepth);
  const inModifier = yield select(data.current.inModifier);
  const address = yield select(data.current.address); //storage address, not code address
  const compilationId = yield select(data.current.compilationId);
  const internalFor = yield select(data.current.internalSourceFor);
  //just in case it ever becomes possible to have a Solidity generated source

  let assignments, preambleAssignments;

  //HACK: modifier preamble
  //modifier definitions are typically skipped (this includes constructor
  //definitions when called as a base constructor); as such I've added this
  //"modifier preamble" to catch them
  if (yield select(data.current.aboutToModify)) {
    const modifier = yield select(data.current.modifierBeingInvoked);
    //may be either a modifier or base constructor
    const currentIndex = yield select(data.current.modifierArgumentIndex);
    debug("currentIndex %d", currentIndex);
    const parameters = modifier.parameters.parameters;
    //now: look at the parameters *after* the current index.  we'll need to
    //adjust for those.
    const parametersLeft = parameters.slice(currentIndex + 1);
    const adjustment = sum(parametersLeft.map(Codec.Ast.Utils.stackSize));
    debug("adjustment %d", adjustment);
    preambleAssignments = assignParameters(
      compilationId,
      internalFor,
      parameters,
      top + adjustment,
      currentDepth,
      modifierDepth,
      modifier.nodeType === "ModifierDefinition"
    );
  } else {
    preambleAssignments = {};
  }

  switch (node.nodeType) {
    case "FunctionDefinition":
    case "ModifierDefinition":
      //NOTE: this will *not* catch most modifier definitions!
      //the rest hopefully will be caught by the modifier preamble
      //(in fact they won't all be, but...)

      //HACK: filter out some garbage
      //this filters out the case where we're really in an invocation of a
      //modifier or base constructor, but have temporarily hit the definition
      //node for some reason.  However this obviously can have a false positive
      //in the case where a function has the same modifier twice.
      const nextModifier = yield select(data.next.modifierBeingInvoked);
      if (nextModifier && nextModifier.id === node.id) {
        break;
      }

      const parameters = node.parameters.parameters;
      //note that we do *not* include return parameters, since those are
      //handled by the VariableDeclaration case (no, I don't know why it
      //works out that way)

      //we can skip preambleAssignments here, that isn't used in this case
      assignments = assignParameters(
        compilationId,
        internalFor,
        parameters,
        top,
        currentDepth,
        modifierDepth,
        inModifier
      );

      debug("Function definition case");
      debug("assignments %O", assignments);

      yield put(actions.assign(assignments));
      break;

    case "YulFunctionDefinition": {
      const nextPointer = yield select(data.next.pointer);
      if (nextPointer === null || !nextPointer.startsWith(`${pointer}/body/`)) {
        //in this case, we're seeing the function
        //as it's being defined, rather than as it's
        //being called
        //notice the final slash; when you enter a function, you go *strictly inside*
        //its body (if you hit the body node itself you are seeing the definition)
        break;
      }
      //yul parameters are a bit weird.
      //whereas solidity parameters go bottom to top,
      //first inputs then outputs (and we skip handling the outputs),
      //yul parameters have the inputs go top to bottom,
      //and the outputs go bottom to top (again with the outputs on top)
      //note we need to handle both inputs and outputs here
      const returnSuffixes = (node.returnVariables || []).map(
        (_, index, vars) => `/returnVariables/${vars.length - 1 - index}`
      );
      const parameterSuffixes = (node.parameters || []).map(
        (_, index) => `/parameters/${index}`
      );
      //HACK: prior to 0.6.8, we *also* need to account for any bare lets (ones
      //w/no value given) at the beginning of the function body because these
      //will throw off our count otherwise
      let bareLetSuffixes = []; //when hack is not invoked, we just leave this empty
      if (!(yield select(data.current.bareLetsInYulAreHit))) {
        let outerIndex = 0;
        for (const declaration of node.body.statements) {
          if (
            declaration.nodeType !== "YulVariableDeclaration" ||
            declaration.value != null
          ) {
            //deliberate != for future Solidity versions
            break;
          }
          for (
            let innerIndex = 0;
            innerIndex < declaration.variables.length;
            innerIndex++
          ) {
            //we want to process from top to bottom, so we'll put the earlier
            //variables last
            bareLetSuffixes.unshift(
              `/body/statements/${outerIndex}/variables/${innerIndex}`
            );
          }
          outerIndex++;
        }
      }
      //both outputs and inputs in the appropriate order (top to bottom)
      //(well, and those lets...)
      const suffixes = bareLetSuffixes.concat(
        returnSuffixes,
        parameterSuffixes
      );
      debug("suffixes: %O", suffixes);
      assignments = {};
      let position = top; //because that's how we'll process things
      const sourceIndex = yield select(data.current.sourceIndex);
      for (const suffix of suffixes) {
        //we only care about the pointer, not the variable
        const sourceAndPointer = makePath(sourceIndex, pointer + suffix);
        const assignment = makeAssignment(
          {
            compilationId,
            internalFor,
            astRef: sourceAndPointer,
            stackframe: currentDepth,
            modifierDepth: inModifier ? modifierDepth : null
          },
          {
            location: "stack",
            from: position, //all Yul variables are size 1
            to: position
          }
        );
        assignments[assignment.id] = assignment;
        position--;
      }
      yield put(actions.assign(assignments));
      break;
    }
    case "ContractDefinition": {
      const allocations = yield select(data.current.allocations.state);
      const allocation = allocations[node.id];

      debug("Contract definition case");
      debug("allocations %O", allocations);
      debug("allocation %O", allocation);
      assignments = {};
      for (let id in allocation.members) {
        id = Number(id); //used for .. in loop so get them as strings
        const idObj = {
          compilationId,
          internalFor,
          astRef: id
        };
        //these aren't locals, so we omit stackframe and modifier info
        const ref = allocation.members[id].pointer;
        const assignment = makeAssignment(idObj, ref);
        assignments[assignment.id] = assignment;
      }
      //one more: add in the fallback input assignment here
      const fallbackDefinition = node.nodes.find(
        subNode => subNode.nodeType === "FunctionDefinition" &&
          Codec.Ast.Utils.functionKind(subNode) === "fallback"
      );
      if (fallbackDefinition) {
        const fallbackInputDefinition = fallbackDefinition.parameters.parameters[0]; //may be undefined
        if (fallbackInputDefinition) {
          const base = yield select(data.current.fallbackBase);
          const ref = { 
            location: "stack",
            from: base,
            to: base + Codec.Ast.Utils.stackSize(fallbackInputDefinition) - 1
            //note: we will always have to===from+1, since it's always bytes calldata, but
            //we'll do it this way just to be safe
          }; //fallback input is always at the very bottom
          const idObj = {
            compilationId,
            internalFor,
            astRef: fallbackInputDefinition.id,
            stackframe: currentDepth, //note the lack of a jump into fallbacks
            modifierDepth: null //it's a function body variable
          };
          const assignment =
            makeAssignment(idObj, ref);
          assignments[assignment.id] = assignment;
        }
      }
      debug("assignments %O", assignments);

      //this case doesn't need preambleAssignments either
      yield put(actions.assign(assignments));
      break;
    }
    case "FunctionTypeName": {
      //HACK
      //for some reasons, for declarations of local variables of function type,
      //we land on the FunctionTypeName instead of the VariableDeclaration,
      //so we replace the node with its parent (the VariableDeclaration)
      const scopes = yield select(data.current.scopes.inlined);
      node = scopes[scopes[node.id].parentId].definition;
      //let's do a quick check that it *is* a VariableDeclaration before
      //continuing
      if (node.nodeType !== "VariableDeclaration") {
        break;
      }
    }
    //otherwise, deliberately fall through to the VariableDeclaration case
    //NOTE: DELIBERATE FALL-THROUGH
    case "VariableDeclaration": {
      const varId = node.id;
      debug("Variable declaration case");
      debug("currentDepth %d varId %d", currentDepth, varId);

      const inFunctionOrModifier = yield select(
        data.current.inFunctionOrModifier
      );
      if (!inFunctionOrModifier) {
        //if we're not in a function or modifier, then this is a contract
        //variable, not a local variable, and should not be included
        debug("already a contract variable!");
        break;
      }

      //otherwise, go ahead and make the assignment
      const assignment = makeAssignment(
        {
          compilationId,
          internalFor,
          astRef: varId,
          stackframe: currentDepth,
          modifierDepth: inModifier ? modifierDepth : null
        },
        {
          location: "stack",
          from: top - Codec.Ast.Utils.stackSize(node) + 1,
          to: top
        }
      );
      assignments = { [assignment.id]: assignment };
      //this case doesn't need preambleAssignments either
      debug("assignments: %O", assignments);
      yield put(actions.assign(assignments));
      break;
    }
    case "YulFunctionCall": {
      const nextPointer = yield select(data.next.pointer);
      if (nextPointer !== null && nextPointer.startsWith(pointer)) {
        //if we're moving inside the function call itself, ignore it
        break;
      }
    }
    //NOTE: DELIBERATE FALL-THROUGH
    case "YulLiteral":
    case "YulIdentifier":
      //yul variable declaration, maybe
      const parentPointer = pointer.replace(/\/[^/]*$/, ""); //chop off end
      const root = yield select(data.current.root);
      const parent = jsonpointer.get(root, parentPointer);
      if (
        pointer !== `${parentPointer}/value` ||
        parent.nodeType !== "YulVariableDeclaration"
      ) {
        break;
      }
      node = parent;
      pointer = parentPointer;
    //NOTE: DELIBERATE FALL-THROUGH
    case "YulVariableDeclaration": {
      const sourceIndex = yield select(data.current.sourceIndex);
      const sourceAndPointer = makePath(sourceIndex, pointer);
      debug("sourceAndPointer: %s", sourceAndPointer);
      assignments = {};
      //variables go on from bottom to top, so process from top to bottom
      let position = top; //NOTE: remember that which stack we use depends on our node type!
      for (let index = node.variables.length - 1; index >= 0; index--) {
        //we only care about the pointer, not the variable
        const variableSourceAndPointer = `${sourceAndPointer}/variables/${index}`;
        const assignment = makeAssignment(
          {
            compilationId,
            internalFor,
            astRef: variableSourceAndPointer,
            stackframe: currentDepth,
            modifierDepth: inModifier ? modifierDepth : null
          },
          {
            location: "stack",
            from: position, //all Yul variables are size 1
            to: position
          }
        );
        assignments[assignment.id] = assignment;
        position--;
      }

      //this case doesn't need preambleAssignments, obviously!
      yield put(actions.assign(assignments));
      break;
    }
    case "IndexAccess": {
      // to track `mapping` types known indices
      // (and also *some* known indices for arrays)

      debug("Index access case");

      //we're going to start by doing the same thing as in the default case
      //(see below) -- getting things ready for an assignment.  Then we're
      //going to forget this for a bit while we handle the rest...
      assignments = {
        ...preambleAssignments,
        ...literalAssignments(
          compilationId,
          internalFor,
          node,
          stack,
          currentDepth,
          modifierDepth,
          inModifier
        )
      };

      //we'll need this
      const baseExpression = node.baseExpression;

      //but first, a diversion -- is this something that could not *possibly*
      //lead to a mapping?  i.e., either a bytes, or an array of non-reference
      //types, or a non-storage array?
      //if so, we'll just do the assign and quit out early
      //(note: we write it this way because mappings aren't caught by
      //isReference)
      if (
        Codec.Ast.Utils.typeClass(baseExpression) === "bytes" ||
        (Codec.Ast.Utils.typeClass(baseExpression) === "array" &&
          (Codec.Ast.Utils.isReference(node)
            ? Codec.Ast.Utils.referenceType(baseExpression) !== "storage"
            : !Codec.Ast.Utils.isMapping(node)))
      ) {
        debug("Index case bailed out early");
        debug("typeClass %s", Codec.Ast.Utils.typeClass(baseExpression));
        debug(
          "referenceType %s",
          Codec.Ast.Utils.referenceType(baseExpression)
        );
        debug("isReference(node) %o", Codec.Ast.Utils.isReference(node));
        yield put(actions.assign(assignments));
        break;
      }

      const allocations = yield select(data.current.allocations.state);
      const currentAssignments = yield select(data.proc.assignments);

      const path = fetchBasePath(
        compilationId,
        internalFor,
        baseExpression,
        currentAssignments,
        allocations,
        currentDepth,
        modifierDepth,
        inModifier
      );
      //this may fail, so let's check for that
      if (path === null) {
        debug("bailed out due to failed path");
        yield put(actions.assign(assignments));
        break;
      }

      const scopes = yield select(data.current.scopes.inlined);

      let keyDefinition = Codec.Ast.Utils.keyDefinition(baseExpression, scopes);
      //if we're dealing with an array, this will just spoof up a uint
      //definition :)

      //now... the decoding! (this is messy)
      let indexValue = yield* decodeMappingKeySaga(
        node.indexExpression,
        keyDefinition
      );

      debug("index value %O", indexValue);
      debug("keyDefinition %o", keyDefinition);

      //whew! But we're not done yet -- we need to turn this decoded key into
      //an actual path (assuming we *did* decode it; we check both for null
      //and for the result being a Value and not an Error)
      //OK, not an actual path -- we're just going to use a simple offset for
      //the path.  But that's OK, because the mappedPaths reducer will turn
      //it into an actual path.
      if (indexValue != null && indexValue.value) {
        let slot = { path };

        //we need to do things differently depending on whether we're dealing
        //with an array or mapping
        switch (Codec.Ast.Utils.typeClass(baseExpression)) {
          case "array":
            const compiler = yield select(data.current.compiler);
            const storageAllocations = yield select(
              data.info.allocations.storage
            );
            const userDefinedTypes = yield select(data.views.userDefinedTypes);
            slot.hashPath = Codec.Ast.Utils.isDynamicArray(baseExpression);
            slot.offset = indexValue.value.asBN.muln(
              Codec.Storage.Allocate.storageSize(
                Codec.Ast.Import.definitionToType(
                  node,
                  compilationId,
                  compiler
                ),
                userDefinedTypes,
                storageAllocations
              ).words
            );
            break;
          case "mapping":
            slot.key = indexValue;
            slot.offset = new BN(0);
            break;
          default:
            debug("unrecognized index access!");
        }
        debug("slot %O", slot);

        //now, map it! (and do the assign as well)
        yield put(
          actions.mapPathAndAssign(
            address,
            slot,
            assignments,
            Codec.Ast.Utils.typeIdentifier(node),
            Codec.Ast.Utils.typeIdentifier(baseExpression)
          )
        );
      } else {
        //if we failed to decode, just do the assign from above
        debug("failed to decode, just assigning");
        yield put(actions.assign(assignments));
      }

      break;
    }
    case "MemberAccess": {
      //we're going to start by doing the same thing as in the default case
      //(see below) -- getting things ready for an assignment.  Then we're
      //going to forget this for a bit while we handle the rest...
      assignments = {
        ...preambleAssignments,
        ...literalAssignments(
          compilationId,
          internalFor,
          node,
          stack,
          currentDepth,
          modifierDepth,
          inModifier
        )
      };

      debug("Member access case");

      //MemberAccess uses expression, not baseExpression
      const baseExpression = node.expression;

      //if this isn't a storage struct, or the element isn't of reference type,
      //we'll just do the assignment and quit out (again, note that mappings
      //aren't caught by isReference)
      if (
        Codec.Ast.Utils.typeClass(baseExpression) !== "struct" ||
        (Codec.Ast.Utils.isReference(node)
          ? Codec.Ast.Utils.referenceType(baseExpression) !== "storage"
          : !Codec.Ast.Utils.isMapping(node))
      ) {
        debug("Member case bailed out early");
        yield put(actions.assign(assignments));
        break;
      }

      const allocations = yield select(data.current.allocations.state);
      const currentAssignments = yield select(data.proc.assignments);

      //but if it is a storage struct, we have to map the path as well
      const path = fetchBasePath(
        compilationId,
        internalFor,
        baseExpression,
        currentAssignments,
        allocations,
        currentDepth,
        modifierDepth,
        inModifier
      );
      //this may fail, so let's check for that
      if (path === null) {
        debug("bailed out due to failed path");
        yield put(actions.assign(assignments));
        break;
      }

      let slot = { path };

      const compiler = yield select(data.current.compiler);
      const structType = Codec.Ast.Import.definitionToType(
        baseExpression,
        compilationId,
        compiler
      );
      const storageAllocations = yield select(data.info.allocations.storage);
      const memberAllocations = storageAllocations[structType.id].members;
      const scopes = yield select(data.current.scopes.inlined);
      //members of a given struct have unique names so it's safe to look up the member by name
      const memberName = scopes[node.referencedDeclaration].definition.name;
      const memberAllocation = memberAllocations.find(
        member => member.name === memberName
      );

      slot.offset = memberAllocation.pointer.range.from.slot.offset.clone();

      debug("slot %o", slot);
      yield put(
        actions.mapPathAndAssign(
          address,
          slot,
          assignments,
          Codec.Ast.Utils.typeIdentifier(node),
          Codec.Ast.Utils.typeIdentifier(baseExpression)
        )
      );
      break;
    }
    default:
      if (node.id === undefined || node.typeDescriptions == undefined) {
        break;
      }

      debug("decoding expression value %O", node.typeDescriptions);
      debug("default case");
      debug("currentDepth %d node.id %d", currentDepth, node.id);

      assignments = {
        ...preambleAssignments,
        ...literalAssignments(
          compilationId,
          internalFor,
          node,
          stack,
          currentDepth,
          modifierDepth,
          inModifier
        )
      };
      yield put(actions.assign(assignments));
      break;
  }
}

function* decodeMappingKeySaga(indexDefinition, keyDefinition) {
  //something of a HACK -- cleans any out-of-range booleans
  //resulting from the main mapping key decoding loop
  const indexValue = yield* decodeMappingKeyCore(
    indexDefinition,
    keyDefinition
  );
  return indexValue ? Codec.Conversion.cleanBool(indexValue) : indexValue;
}

function* decodeMappingKeyCore(indexDefinition, keyDefinition) {
  const scopes = yield select(data.current.scopes.inlined);
  const compilationId = yield select(data.current.compilationId);
  const internalFor = yield select(data.current.internalSourceFor); //should be null, but...
  const currentAssignments = yield select(data.proc.assignments);
  const currentDepth = yield select(data.current.functionDepth);
  const modifierDepth = yield select(data.current.modifierDepth);
  const inModifier = yield select(data.current.inModifier);

  //why the loop? see the end of the block it heads for an explanatory
  //comment
  while (true) {
    const indexId = indexDefinition.id;
    //indices need to be identified by stackframe
    const indexIdObj = {
      compilationId,
      internalFor,
      astRef: indexId,
      stackframe: currentDepth,
      modifierDepth: inModifier ? modifierDepth : null
    };
    const fullIndexId = stableKeccak256(indexIdObj);

    const indexReference = (currentAssignments[fullIndexId] || {}).ref;

    if (Codec.Ast.Utils.isSimpleConstant(indexDefinition)) {
      //while the main case is the next one, where we look for a prior
      //assignment, we need this case (and need it first) for two reasons:
      //1. some constant expressions (specifically, string and hex literals)
      //aren't sourcemapped to and so won't have a prior assignment
      //2. if the key type is bytesN but the expression is constant, the
      //value will go on the stack *left*-padded instead of right-padded,
      //so looking for a prior assignment will read the wrong value.
      //so instead it's preferable to use the constant directly.
      debug("about to decode simple literal");
      return yield* decode(
        keyDefinition,
        {
          location: "definition",
          definition: indexDefinition
        },
        compilationId
      );
    } else if (indexReference) {
      //if a prior assignment is found
      let splicedDefinition;
      //in general, we want to decode using the key definition, not the index
      //definition. however, the key definition may have the wrong location
      //on it.  so, when applicable, we splice the index definition location
      //onto the key definition location.
      if (Codec.Ast.Utils.isReference(indexDefinition)) {
        splicedDefinition = Codec.Ast.Utils.spliceLocation(
          keyDefinition,
          Codec.Ast.Utils.referenceType(indexDefinition)
        );
        //we could put code here to add on the "_ptr" ending when absent,
        //but we presently ignore that ending, so we'll skip that
      } else {
        splicedDefinition = keyDefinition;
      }
      debug("about to decode");
      return yield* decode(splicedDefinition, indexReference, compilationId);
    } else if (
      indexDefinition.referencedDeclaration &&
      scopes[indexDefinition.referencedDeclaration]
    ) {
      //there's one more reason we might have failed to decode it: it might be a
      //constant state variable.  Unfortunately, we don't know how to decode all
      //those at the moment, but we can handle the ones we do know how to decode.
      //In the future hopefully we will decode all of them
      debug("referencedDeclaration %d", indexDefinition.referencedDeclaration);
      let indexConstantDeclaration =
        scopes[indexDefinition.referencedDeclaration].definition;
      debug("indexConstantDeclaration %O", indexConstantDeclaration);
      if (indexConstantDeclaration.constant) {
        let indexConstantDefinition = indexConstantDeclaration.value;
        //next line filters out constants we don't know how to handle
        if (Codec.Ast.Utils.isSimpleConstant(indexConstantDefinition)) {
          debug("about to decode simple constant");
          return yield* decode(
            keyDefinition,
            {
              location: "definition",
              definition: indexConstantDeclaration.value
            },
            compilationId
          );
        } else {
          return null; //can't decode; see below for more explanation
        }
      } else {
        return null; //can't decode; see below for more explanation
      }
    }
    //there's still one more reason we might have failed to decode it:
    //certain (silent) type conversions aren't sourcemapped either.
    //(thankfully, any type conversion that actually *does* something seems
    //to be sourcemapped.)  So if we've failed to decode it, we try again
    //with the argument of the type conversion, if it is one; we leave
    //indexValue undefined so the loop will continue
    //(note that this case is last for a reason; if this were earlier, it
    //would catch *non*-silent type conversions, which we want to just read
    //off the stack)
    else if (indexDefinition.kind === "typeConversion") {
      indexDefinition = indexDefinition.arguments[0];
    }
    //...also prior to 0.5.0, unary + was legal, which needs to be accounted
    //for for the same reason
    else if (
      indexDefinition.nodeType === "UnaryOperation" &&
      indexDefinition.operator === "+"
    ) {
      indexDefinition = indexDefinition.subExpression;
    }
    //otherwise, we've just totally failed to decode it, so we mark
    //indexValue as null (as distinct from undefined) to indicate this.  In
    //the future, we should be able to decode all mapping keys, but we're
    //not quite there yet, sorry (because we can't yet handle all constant
    //state variables)
    else {
      return null;
    }
    //now, as mentioned, retry in the typeConversion case
    //(or unary + case)
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* recordAllocations() {
  const contracts = yield select(data.views.contractAllocationInfo);
  const referenceDeclarations = yield select(data.views.referenceDeclarations);
  const userDefinedTypes = yield select(data.views.userDefinedTypes);
  const storageAllocations = Codec.Storage.Allocate.getStorageAllocations(
    userDefinedTypes
  );
  const memoryAllocations = Codec.Memory.Allocate.getMemoryAllocations(
    userDefinedTypes
  );
  const abiAllocations = Codec.AbiData.Allocate.getAbiAllocations(
    userDefinedTypes
  );
  const calldataAllocations = Codec.AbiData.Allocate.getCalldataAllocations(
    contracts,
    referenceDeclarations,
    userDefinedTypes,
    abiAllocations
  );
  const stateAllocations = Codec.Storage.Allocate.getStateAllocations(
    contracts,
    referenceDeclarations,
    userDefinedTypes,
    storageAllocations
  );
  yield put(
    actions.allocate(
      storageAllocations,
      memoryAllocations,
      abiAllocations,
      calldataAllocations,
      stateAllocations
    )
  );
}

function literalAssignments(
  compilationId,
  internalFor,
  node,
  stack,
  currentDepth,
  modifierDepth,
  inModifier
) {
  let top = stack.length - 1;

  let literal;
  try {
    literal = Codec.Stack.Read.readStack(
      {
        location: "stack",
        from: top - Codec.Ast.Utils.stackSize(node) + 1,
        to: top
      },
      {
        stack,
        storage: {} //irrelevant, but let's respect the type signature :)
      }
    );
  } catch (error) {
    literal = undefined; //not sure if this is right, but this is what would
    //happen before, so I figure it's safe?
  }

  let assignment = makeAssignment(
    {
      compilationId,
      internalFor,
      astRef: node.id,
      stackframe: currentDepth,
      modifierDepth: inModifier ? modifierDepth : null
    },
    { location: "stackliteral", literal }
  );

  return { [assignment.id]: assignment };
}

//takes a parameter list as given in the AST
function assignParameters(
  compilationId,
  internalFor,
  parameters,
  top,
  functionDepth,
  modifierDepth = 0,
  forModifier = false
) {
  let reverseParameters = parameters.slice().reverse();
  //reverse is in-place, so we use slice() to clone first
  debug("reverseParameters %o", parameters);

  let currentPosition = top;
  let assignments = {};

  for (let parameter of reverseParameters) {
    let words = Codec.Ast.Utils.stackSize(parameter);
    let pointer = {
      location: "stack",
      from: currentPosition - words + 1,
      to: currentPosition
    };
    let assignment = makeAssignment(
      {
        compilationId,
        internalFor,
        astRef: parameter.id,
        stackframe: functionDepth,
        modifierDepth: forModifier ? modifierDepth : null
      },
      pointer
    );
    assignments[assignment.id] = assignment;
    currentPosition -= words;
  }
  return assignments;
}

function fetchBasePath(
  compilationId,
  internalFor,
  baseNode,
  currentAssignments,
  allocations,
  currentDepth,
  modifierDepth,
  inModifier
) {
  const fullId = stableKeccak256({
    compilationId,
    internalFor,
    astRef: baseNode.id,
    stackframe: currentDepth,
    modifierDepth: inModifier ? modifierDepth : null
  });
  debug("astId: %d", baseNode.id);
  debug("stackframe: %d", currentDepth);
  debug("fullId: %s", fullId);
  debug("currentAssignments: %O", currentAssignments);
  //base expression is an expression, and so has a literal assigned to
  //it (unless it doesn't, in which case we have to handle that case)
  const baseAssignment = currentAssignments[fullId];
  if (baseAssignment) {
    const offset = Codec.Conversion.toBN(baseAssignment.ref.literal);
    return { offset };
  }
  //if nothing was assigned to the base expression, we have a fallback we'll attempt:
  //we'll check if it's a top-level state variable and look up its allocation if so.
  const referencedId = baseNode.referencedDeclaration;
  if (referencedId != undefined) {
    //deliberate use of !=
    const allocation = allocations[referencedId];
    if (allocation && allocation.pointer.location === "storage") {
      return allocation.pointer.range.from.slot;
    }
  }
  //if that doesn't work either, give up
  return null;
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("data", saga);
