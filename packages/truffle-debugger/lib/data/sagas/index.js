import debugModule from "debug";
const debug = debugModule("debugger:data:sagas");

import { put, takeEvery, select } from "redux-saga/effects";

import { prefixName, stableKeccak256, makeAssignment } from "lib/helpers";

import { TICK } from "lib/trace/actions";
import * as actions from "../actions";
import * as trace from "lib/trace/sagas";
import * as evm from "lib/evm/sagas";
import * as web3 from "lib/web3/sagas";

import data from "../selectors";

import sum from "lodash.sum";

import * as DecodeUtils from "truffle-decode-utils";
import {
  getStorageAllocations,
  getMemoryAllocations,
  getCalldataAllocations,
  readStack,
  storageSize,
  forEvmState
} from "truffle-decoder";
import BN from "bn.js";

export function* scope(nodeId, pointer, parentId, sourceId) {
  yield put(actions.scope(nodeId, pointer, parentId, sourceId));
}

export function* declare(node) {
  yield put(actions.declare(node));
}

export function* defineType(node) {
  yield put(actions.defineType(node));
}

function* tickSaga() {
  debug("got TICK");

  yield* variablesAndMappingsSaga();
  debug("about to SUBTOCK");
  yield* trace.signalTickSagaCompletion();
}

export function* decode(definition, ref) {
  let referenceDeclarations = yield select(data.views.referenceDeclarations);
  let state = yield select(data.current.state);
  let mappingKeys = yield select(data.views.mappingKeys);
  let allocations = yield select(data.info.allocations);
  let instances = yield select(data.views.instances);
  let contexts = yield select(data.views.contexts);
  let currentContext = yield select(data.current.context);
  let internalFunctionsTable = yield select(
    data.current.functionsByProgramCounter
  );
  let blockNumber = yield select(data.views.blockNumber);

  let ZERO_WORD = new Uint8Array(DecodeUtils.EVM.WORD_SIZE);
  ZERO_WORD.fill(0);
  let NO_CODE = new Uint8Array(); //empty array

  let decoder = forEvmState(definition, ref, {
    referenceDeclarations,
    state,
    mappingKeys,
    storageAllocations: allocations.storage,
    memoryAllocations: allocations.memory,
    calldataAllocations: allocations.calldata,
    contexts,
    currentContext,
    internalFunctionsTable
  });

  let result = decoder.next();
  while (!result.done) {
    let request = result.value;
    let response;
    switch (request.type) {
      case "storage":
        //the debugger supplies all storage it knows at the beginning.
        //any storage it does not know is presumed to be zero.
        response = ZERO_WORD;
        break;
      case "code":
        let address = request.address;
        if (address in instances) {
          response = instances[address];
        } else if (address === DecodeUtils.EVM.ZERO_ADDRESS) {
          //HACK: to avoid displaying the zero address to the user as an
          //affected address just because they decoded a contract or external
          //function variable that hadn't been initialized yet, we give the
          //zero address's codelessness its own private cache :P
          response = NO_CODE;
        } else {
          //I don't want to write a new web3 saga, so let's just use
          //obtainBinaries with a one-element array
          debug("fetching binary");
          let binary = (yield* web3.obtainBinaries([address], blockNumber))[0];
          debug("adding instance");
          yield* evm.addInstance(address, binary);
          response = DecodeUtils.Conversion.toBytes(binary);
        }
        break;
      default:
        debug("unrecognized request type!");
    }
    result = decoder.next(response);
  }
  //at this point, result.value holds the final value
  //note: we're still using the old decoder output format, so we need to clean
  //containers before returning something the debugger can use
  return DecodeUtils.Conversion.cleanContainers(result.value);
}

function* variablesAndMappingsSaga() {
  let node = yield select(data.current.node);
  let scopes = yield select(data.views.scopes.inlined);
  let referenceDeclarations = yield select(data.views.referenceDeclarations);
  let allocations = yield select(data.info.allocations.storage);
  let currentAssignments = yield select(data.proc.assignments);
  let mappedPaths = yield select(data.proc.mappedPaths);
  let currentDepth = yield select(data.current.functionDepth);
  let address = yield select(data.current.address);
  //storage address, not code address

  let stack = yield select(data.next.state.stack); //note the use of next!
  //in this saga we are interested in the *results* of the current instruction
  //note that the decoder is still based on data.current.state; that's fine
  //though.  There's already a delay between when we record things off the
  //stack and when we decode them, after all.  Basically, nothing serious
  //should happen after an index node but before the index access node that
  //would cause storage, memory, or calldata to change, meaning that even if
  //the literal we recorded was a pointer, it will still be valid at the time
  //we use it.  (The other literals we make use of, for the base expressions,
  //are not decoded, so no potential mismatch there would be relevant anyway.)

  let alternateStack = yield select(data.nextMapped.state.stack);
  //HACK: unfortunately, in some cases, data.next.state.stack gets the wrong
  //results due to unmapped instructions intervening.  So, we get the stack at
  //the next *mapped* stack instead.  This is something of a hack and won't
  //work if we're about to change context, but it should work in the cases that
  //need it.

  if (!stack) {
    return;
  }

  let top = stack.length - 1;
  var assignment, assignments, preambleAssignments, baseExpression, slot, path;

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

  //HACK: modifier preamble
  //modifier definitions are typically skipped (this includes constructor
  //definitions when called as a base constructor); as such I've added this
  //"modifier preamble" to catch them
  if (yield select(data.current.aboutToModify)) {
    let modifier = yield select(data.current.modifierBeingInvoked);
    //may be either a modifier or base constructor
    let currentIndex = yield select(data.current.modifierArgumentIndex);
    debug("currentIndex %d", currentIndex);
    let parameters = modifier.parameters.parameters;
    //now: look at the parameters *after* the current index.  we'll need to
    //adjust for those.
    let parametersLeft = parameters.slice(currentIndex + 1);
    let adjustment = sum(parametersLeft.map(DecodeUtils.Definition.stackSize));
    debug("adjustment %d", adjustment);
    preambleAssignments = assignParameters(
      parameters,
      top + adjustment,
      currentDepth
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
      let nextModifier = yield select(data.next.modifierBeingInvoked);
      if (nextModifier && nextModifier.id === node.id) {
        break;
      }

      let parameters = node.parameters.parameters;
      //note that we do *not* include return parameters, since those are
      //handled by the VariableDeclaration case (no, I don't know why it
      //works out that way)

      //we can skip preambleAssignments here, that isn't used in this case
      assignments = assignParameters(parameters, top, currentDepth);

      debug("Function definition case");
      debug("assignments %O", assignments);

      yield put(actions.assign(assignments));
      break;

    case "ContractDefinition":
      let allocation = allocations[node.id];

      debug("Contract definition case");
      debug("allocations %O", allocations);
      debug("allocation %O", allocation);
      assignments = {};
      for (let id in allocation.members) {
        id = Number(id); //not sure why we're getting them as strings, but...
        let idObj = { astId: id, address };
        let fullId = stableKeccak256(idObj);
        //we don't use makeAssignment here as we had to compute the ID anyway
        assignment = {
          ...idObj,
          id: fullId,
          ref: {
            ...((currentAssignments.byId[fullId] || {}).ref || {}),
            ...allocation.members[id].pointer
          }
        };
        assignments[fullId] = assignment;
      }
      debug("assignments %O", assignments);

      //this case doesn't need preambleAssignments either
      yield put(actions.assign(assignments));
      break;

    case "FunctionTypeName":
      //HACK
      //for some reasons, for declarations of local variables of function type,
      //we land on the FunctionTypeName instead of the VariableDeclaration,
      //so we replace the node with its parent (the VariableDeclaration)
      node = scopes[scopes[node.id].parentId].definition;
      //let's do a quick check that it *is* a VariableDeclaration before
      //continuing
      if (node.nodeType !== "VariableDeclaration") {
        break;
      }
    //otherwise, deliberately fall through to the VariableDeclaration case
    //NOTE: DELIBERATE FALL-THROUGH
    case "VariableDeclaration":
      let varId = node.id;
      debug("Variable declaration case");
      debug("currentDepth %d varId %d", currentDepth, varId);

      //NOTE: We're going to make the assignment conditional here; here's why.
      //There's a bug where calling the autogenerated accessor for a public
      //contract variable causes the debugger to see two additional
      //declarations for that variable... which this code reads as local
      //variable declarations.  Rather than prevent this at the source, we're
      //just going to check for it here, by not adding a local variable if said
      //variable is already a contract variable.

      if (
        currentAssignments.byAstId[varId] !== undefined &&
        currentAssignments.byAstId[varId].some(
          id => currentAssignments.byId[id].address !== undefined
        )
      ) {
        debug("already a contract variable!");
        break;
      }

      //otherwise, go ahead and make the assignment
      assignment = makeAssignment(
        { astId: varId, stackframe: currentDepth },
        {
          stack: {
            from: top - DecodeUtils.Definition.stackSize(node) + 1,
            to: top
          }
        }
      );
      assignments = { [assignment.id]: assignment };
      //this case doesn't need preambleAssignments either
      debug("assignments: %O", assignments);
      yield put(actions.assign(assignments));
      break;

    case "IndexAccess":
      // to track `mapping` types known indices
      // (and also *some* known indices for arrays)

      //HACK: we use the alternate stack in this case

      debug("Index access case");

      //we're going to start by doing the same thing as in the default case
      //(see below) -- getting things ready for an assignment.  Then we're
      //going to forget this for a bit while we handle the rest...
      assignments = {
        ...preambleAssignments,
        ...literalAssignments(node, alternateStack, currentDepth)
      };

      //we'll need this
      baseExpression = node.baseExpression;

      //but first, a diversion -- is this something that could not *possibly*
      //lead to a mapping?  i.e., either a bytes, or an array of non-reference
      //types, or a non-storage array?
      //if so, we'll just do the assign and quit out early
      //(note: we write it this way because mappings aren't caught by
      //isReference)
      if (
        DecodeUtils.Definition.typeClass(baseExpression) === "bytes" ||
        (DecodeUtils.Definition.typeClass(baseExpression) === "array" &&
          (DecodeUtils.Definition.isReference(node)
            ? DecodeUtils.Definition.referenceType(baseExpression) !== "storage"
            : !DecodeUtils.Definition.isMapping(node)))
      ) {
        debug("Index case bailed out early");
        debug("typeClass %s", DecodeUtils.Definition.typeClass(baseExpression));
        debug(
          "referenceType %s",
          DecodeUtils.Definition.referenceType(baseExpression)
        );
        debug("isReference(node) %o", DecodeUtils.Definition.isReference(node));
        yield put(actions.assign(assignments));
        break;
      }

      let keyDefinition = DecodeUtils.Definition.keyDefinition(
        baseExpression,
        scopes
      );
      //if we're dealing with an array, this will just hack up a uint definition
      //:)

      //begin subsection: key decoding
      //(I tried factoring this out into its own saga but it didn't work when I
      //did :P )

      let indexValue;
      let indexDefinition = node.indexExpression;

      //why the loop? see the end of the block it heads for an explanatory
      //comment
      while (indexValue === undefined) {
        let indexId = indexDefinition.id;
        //indices need to be identified by stackframe
        let indexIdObj = { astId: indexId, stackframe: currentDepth };
        let fullIndexId = stableKeccak256(indexIdObj);

        const indexReference = (currentAssignments.byId[fullIndexId] || {}).ref;

        if (DecodeUtils.Definition.isSimpleConstant(indexDefinition)) {
          //while the main case is the next one, where we look for a prior
          //assignment, we need this case (and need it first) for two reasons:
          //1. some constant expressions (specifically, string and hex literals)
          //aren't sourcemapped to and so won't have a prior assignment
          //2. if the key type is bytesN but the expression is constant, the
          //value will go on the stack *left*-padded instead of right-padded,
          //so looking for a prior assignment will read the wrong value.
          //so instead it's preferable to use the constant directly.
          debug("about to decode simple literal");
          indexValue = yield* decode(keyDefinition, {
            definition: indexDefinition
          });
        } else if (indexReference) {
          //if a prior assignment is found
          let splicedDefinition;
          //in general, we want to decode using the key definition, not the index
          //definition. however, the key definition may have the wrong location
          //on it.  so, when applicable, we splice the index definition location
          //onto the key definition location.
          if (DecodeUtils.Definition.isReference(indexDefinition)) {
            splicedDefinition = DecodeUtils.Definition.spliceLocation(
              keyDefinition,
              DecodeUtils.Definition.referenceType(indexDefinition)
            );
            //we could put code here to add on the "_ptr" ending when absent,
            //but we presently ignore that ending, so we'll skip that
          } else {
            splicedDefinition = keyDefinition;
          }
          debug("about to decode");
          indexValue = yield* decode(splicedDefinition, indexReference);
        } else if (
          indexDefinition.referencedDeclaration &&
          scopes[indexDefinition.referencedDeclaration]
        ) {
          //there's one more reason we might have failed to decode it: it might be a
          //constant state variable.  Unfortunately, we don't know how to decode all
          //those at the moment, but we can handle the ones we do know how to decode.
          //In the future hopefully we will decode all of them
          debug(
            "referencedDeclaration %d",
            indexDefinition.referencedDeclaration
          );
          let indexConstantDeclaration =
            scopes[indexDefinition.referencedDeclaration].definition;
          debug("indexConstantDeclaration %O", indexConstantDeclaration);
          if (indexConstantDeclaration.constant) {
            let indexConstantDefinition = indexConstantDeclaration.value;
            //next line filters out constants we don't know how to handle
            if (
              DecodeUtils.Definition.isSimpleConstant(indexConstantDefinition)
            ) {
              debug("about to decode simple constant");
              indexValue = yield* decode(keyDefinition, {
                definition: indexConstantDeclaration.value
              });
            } else {
              indexValue = null; //can't decode; see below for more explanation
            }
          } else {
            indexValue = null; //can't decode; see below for more explanation
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
          indexValue = null;
        }
        //now, as mentioned, retry in the typeConversion case
      }

      //end subsection: key decoding

      debug("index value %O", indexValue);
      debug("keyDefinition %o", keyDefinition);

      //whew! But we're not done yet -- we need to turn this decoded key into
      //an actual path (assuming we *did* decode it)
      //OK, not an actual path -- we're just going to use a simple offset for
      //the path.  But that's OK, because the mappedPaths reducer will turn
      //it into an actual path.
      if (indexValue !== null) {
        path = fetchBasePath(
          baseExpression,
          mappedPaths,
          currentAssignments,
          currentDepth
        );

        let slot = { path };

        //we need to do things differently depending on whether we're dealing
        //with an array or mapping
        switch (DecodeUtils.Definition.typeClass(baseExpression)) {
          case "array":
            slot.hashPath = DecodeUtils.Definition.isDynamicArray(
              baseExpression
            );
            slot.offset = indexValue.muln(
              storageSize(node, referenceDeclarations, allocations).words
            );
            break;
          case "mapping":
            slot.key = indexValue;
            slot.keyEncoding = DecodeUtils.Definition.keyEncoding(
              keyDefinition
            );
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
            DecodeUtils.Definition.typeIdentifier(node),
            DecodeUtils.Definition.typeIdentifier(baseExpression)
          )
        );
      } else {
        //if we failed to decode, just do the assign from above
        debug("failed to decode, just assigning");
        yield put(actions.assign(assignments));
      }

      break;

    case "MemberAccess":
      //HACK: we use the alternate stack in this case

      //we're going to start by doing the same thing as in the default case
      //(see below) -- getting things ready for an assignment.  Then we're
      //going to forget this for a bit while we handle the rest...
      assignments = {
        ...preambleAssignments,
        ...literalAssignments(node, alternateStack, currentDepth)
      };

      debug("Member access case");

      //MemberAccess uses expression, not baseExpression
      baseExpression = node.expression;

      //if this isn't a storage struct, or the element isn't of reference type,
      //we'll just do the assignment and quit out (again, note that mappings
      //aren't caught by isReference)
      if (
        DecodeUtils.Definition.typeClass(baseExpression) !== "struct" ||
        (DecodeUtils.Definition.isReference(node)
          ? DecodeUtils.Definition.referenceType(baseExpression) !== "storage"
          : !DecodeUtils.Definition.isMapping(node))
      ) {
        debug("Member case bailed out early");
        yield put(actions.assign(assignments));
        break;
      }

      //but if it is a storage struct, we have to map the path as well
      path = fetchBasePath(
        baseExpression,
        mappedPaths,
        currentAssignments,
        currentDepth
      );

      slot = { path };

      let structId = DecodeUtils.Definition.typeId(baseExpression);
      let memberAllocation =
        allocations[structId].members[node.referencedDeclaration];

      slot.offset = memberAllocation.pointer.storage.from.slot.offset.clone();

      debug("slot %o", slot);
      yield put(
        actions.mapPathAndAssign(
          address,
          slot,
          assignments,
          DecodeUtils.Definition.typeIdentifier(node),
          DecodeUtils.Definition.typeIdentifier(baseExpression)
        )
      );

    default:
      if (node.typeDescriptions == undefined) {
        break;
      }

      debug("decoding expression value %O", node.typeDescriptions);
      debug("default case");
      debug("currentDepth %d node.id %d", currentDepth, node.id);

      assignments = {
        ...preambleAssignments,
        ...literalAssignments(node, stack, currentDepth)
      };
      yield put(actions.assign(assignments));
      break;
  }
}

export function* reset() {
  yield put(actions.reset());
}

export function* recordAllocations() {
  const contracts = yield select(
    data.views.userDefinedTypes.contractDefinitions
  );
  debug("contracts %O", contracts);
  const referenceDeclarations = yield select(data.views.referenceDeclarations);
  debug("referenceDeclarations %O", referenceDeclarations);
  const storageAllocations = getStorageAllocations(
    referenceDeclarations,
    contracts
  );
  debug("storageAllocations %O", storageAllocations);
  const memoryAllocations = getMemoryAllocations(referenceDeclarations);
  const calldataAllocations = getCalldataAllocations(referenceDeclarations);
  yield put(
    actions.allocate(storageAllocations, memoryAllocations, calldataAllocations)
  );
}

function literalAssignments(node, stack, currentDepth) {
  let top = stack.length - 1;

  let literal = readStack(
    stack,
    top - DecodeUtils.Definition.stackSize(node) + 1,
    top
  );

  let assignment = makeAssignment(
    { astId: node.id, stackframe: currentDepth },
    { literal }
  );

  return { [assignment.id]: assignment };
}

//takes a parameter list as given in the AST
function assignParameters(parameters, top, functionDepth) {
  let reverseParameters = parameters.slice().reverse();
  //reverse is in-place, so we use slice() to clone first
  debug("reverseParameters %o", parameters);

  let currentPosition = top;
  let assignments = {};

  for (let parameter of reverseParameters) {
    let words = DecodeUtils.Definition.stackSize(parameter);
    let pointer = {
      stack: {
        from: currentPosition - words + 1,
        to: currentPosition
      }
    };
    let assignment = makeAssignment(
      { astId: parameter.id, stackframe: functionDepth },
      pointer
    );
    assignments[assignment.id] = assignment;
    currentPosition -= words;
  }
  return assignments;
}

function fetchBasePath(
  baseNode,
  mappedPaths,
  currentAssignments,
  currentDepth
) {
  let fullId = stableKeccak256({
    astId: baseNode.id,
    stackframe: currentDepth
  });
  debug("astId: %d", baseNode.id);
  debug("stackframe: %d", currentDepth);
  debug("fullId: %s", fullId);
  debug("currentAssignments: %O", currentAssignments);
  //base expression is an expression, and so has a literal assigned to
  //it
  let offset = DecodeUtils.Conversion.toBN(
    currentAssignments.byId[fullId].ref.literal
  );
  return { offset };
}

export function* saga() {
  yield takeEvery(TICK, tickSaga);
}

export default prefixName("data", saga);
