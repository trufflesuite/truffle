import debugModule from "debug";
const debug = debugModule("debugger:data:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

import * as Codec from "@truffle/codec";
import { makeAssignment, makePath } from "lib/helpers";

const DEFAULT_SCOPES = {
  bySourceId: {}
};

function scopes(state = DEFAULT_SCOPES, action) {
  switch (action.type) {
    case actions.SCOPE: {
      const { sourceId, id, sourceIndex, parentId, pointer } = action;
      const astRef = id !== undefined ? id : makePath(sourceIndex, pointer);
      //astRef is used throughout the data saga.
      //it identifies an AST node within a given compilation either by:
      //1. its ast ID, if it has one, or
      //2. a combination of its source index and its JSON pointer if not

      return {
        bySourceId: {
          ...state.bySourceId,
          [sourceId]: {
            byAstRef: {
              ...(state.bySourceId[sourceId] || {}).byAstRef,
              [astRef]: {
                ...(state.bySourceId[sourceId] || { byAstRef: {} }).byAstRef[
                  astRef
                ],
                id,
                parentId,
                sourceIndex,
                pointer,
                sourceId
              }
            }
          }
        }
      };
    }

    case actions.DECLARE: {
      let { sourceId, name, astRef, scopeAstRef } = action;

      //note: we can assume the scope already exists!
      let scope = state.bySourceId[sourceId].byAstRef[scopeAstRef];
      let variables = scope.variables || [];

      return {
        bySourceId: {
          ...state.bySourceId,
          [sourceId]: {
            byAstRef: {
              ...state.bySourceId[sourceId].byAstRef,
              [scopeAstRef]: {
                ...scope,
                variables: [...variables, { name, astRef, sourceId }]
              }
            }
          }
        }
      };
    }

    default:
      return state;
  }
}

//yes, this is just a flat array as that's what's convenient
function userDefinedTypes(state = [], action) {
  switch (action.type) {
    case actions.DEFINE_TYPE:
      debug("action: %O", action);
      return [...state, { id: action.node.id, sourceId: action.sourceId }];
    default:
      return state;
  }
}

//just going to treat this like userDefinedTypes
function taggedOutputs(state = [], action) {
  switch (action.type) {
    case actions.DEFINE_TAGGED_OUTPUT:
      return [...state, { id: action.node.id, sourceId: action.sourceId }];
    default:
      return state;
  }
}

const DEFAULT_ALLOCATIONS = {
  storage: {},
  memory: {},
  abi: {},
  calldata: {},
  returndata: {},
  state: {}
};

function allocations(state = DEFAULT_ALLOCATIONS, action) {
  if (action.type === actions.ALLOCATE) {
    debug("action: %O", action);
    return {
      storage: action.storage,
      memory: action.memory,
      abi: action.abi,
      calldata: action.calldata,
      returndata: action.returndata,
      state: action.state
    };
  } else {
    return state; //not to be confused with action.state!
  }
}

const info = combineReducers({
  scopes,
  userDefinedTypes,
  taggedOutputs,
  allocations
});

const GLOBAL_ASSIGNMENTS = [
  [{ builtin: "msg" }, { location: "special", special: "msg" }],
  [{ builtin: "tx" }, { location: "special", special: "tx" }],
  [{ builtin: "block" }, { location: "special", special: "block" }],
  [{ builtin: "this" }, { location: "special", special: "this" }],
  [{ builtin: "now" }, { location: "special", special: "timestamp" }] //we don't have an alias "now"
].map(([idObj, ref]) => makeAssignment(idObj, ref));

const DEFAULT_ASSIGNMENTS = {
  byId: Object.assign(
    {}, //we start out with all globals assigned
    ...GLOBAL_ASSIGNMENTS.map(assignment => ({ [assignment.id]: assignment }))
  )
};

function assignments(state = DEFAULT_ASSIGNMENTS, action) {
  switch (action.type) {
    case actions.ASSIGN:
    case actions.MAP_PATH_AND_ASSIGN:
      debug("action.type %O", action.type);
      debug("action.assignments %O", action.assignments);
      return {
        byId: {
          ...state.byId,
          ...action.assignments
        }
      };

    case actions.RESET:
      return DEFAULT_ASSIGNMENTS;

    default:
      return state;
  }
}

const DEFAULT_PATHS = {
  byAddress: {}
};

//WARNING: do *not* rely on mappedPaths to keep track of paths that do not
//involve mapping keys!  Yes, many will get mapped, but there is no guarantee.
//Only when mapping keys are involved does it necessarily work reliably --
//which is fine, as that's all we need it for.
function mappedPaths(state = DEFAULT_PATHS, action) {
  switch (action.type) {
    case actions.MAP_PATH_AND_ASSIGN:
      let { address, slot, typeIdentifier, parentType } = action;
      //how this case works: first, we find the spot in our table (based on
      //address, type identifier, and slot address) where the new entry should
      //be added; if needed we set up all the objects needed along the way.  If
      //there's already something there, we do nothing.  If there's nothing
      //there, we record our given slot in that spot in that table -- however,
      //we alter it in one key way.  Before entry, we check if the slot's
      //*parent* has a spot in the table, based on address (same for both child
      //and parent), parentType, and the parent's slot address (which can be
      //found as the slotAddress of the slot's path object, if it exists -- if
      //it doesn't then we conclude that no the parent does not have a spot in
      //the table).  If the parent has a slot in the table already, then we
      //alter the child slot by replacing its path with the parent slot.  This
      //will keep the slotAddress the same, but since the versions kept in the
      //table here are supposed to preserve path information, we'll be
      //replacing a fairly bare-bones Slot object with one with a full path.

      //we do NOT want to distinguish between types with and without "_ptr" on
      //the end here! (or _slice)
      debug("typeIdentifier %s", typeIdentifier);
      typeIdentifier = Codec.Ast.Utils.regularizeTypeIdentifier(typeIdentifier);
      parentType = Codec.Ast.Utils.regularizeTypeIdentifier(parentType);

      debug("slot %o", slot);
      let hexSlotAddress = Codec.Conversion.toHexString(
        Codec.Storage.Utils.slotAddress(slot),
        Codec.Evm.Utils.WORD_SIZE
      );
      let parentAddress = slot.path
        ? Codec.Conversion.toHexString(
            Codec.Storage.Utils.slotAddress(slot.path),
            Codec.Evm.Utils.WORD_SIZE
          )
        : undefined;

      //this is going to be messy and procedural, sorry.  but let's start with
      //the easy stuff: create the new address if needed, clone if not
      let newState = {
        ...state,
        byAddress: {
          ...state.byAddress,
          [address]: {
            byType: {
              ...(state.byAddress[address] || { byType: {} }).byType
            }
          }
        }
      };

      //now, let's add in the new type, if needed
      newState.byAddress[address].byType = {
        ...newState.byAddress[address].byType,
        [typeIdentifier]: {
          bySlotAddress: {
            ...(
              newState.byAddress[address].byType[typeIdentifier] || {
                bySlotAddress: {}
              }
            ).bySlotAddress
          }
        }
      };

      let oldSlot =
        newState.byAddress[address].byType[typeIdentifier].bySlotAddress[
          hexSlotAddress
        ];
      //yes, this looks strange, but we haven't changed it yet except to
      //clone or create empty (and we don't want undefined!)
      //now: is there something already there or no?  if no, we must add
      if (oldSlot === undefined) {
        let newSlot;
        debug("parentAddress %o", parentAddress);
        if (
          parentAddress !== undefined &&
          newState.byAddress[address].byType[parentType] &&
          newState.byAddress[address].byType[parentType].bySlotAddress[
            parentAddress
          ]
        ) {
          //if the parent is already present, use that instead of the given
          //parent!
          newSlot = {
            ...slot,
            path:
              newState.byAddress[address].byType[parentType].bySlotAddress[
                parentAddress
              ]
          };
        } else {
          newSlot = slot;
        }
        newState.byAddress[address].byType[typeIdentifier].bySlotAddress[
          hexSlotAddress
        ] = newSlot;
      }
      //if there's already something there, we don't need to do anything

      return newState;

    case actions.RESET:
      return DEFAULT_PATHS;

    default:
      return state;
  }
}

const proc = combineReducers({
  assignments,
  mappedPaths
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
