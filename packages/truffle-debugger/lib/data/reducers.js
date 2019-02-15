import debugModule from "debug";
const debug = debugModule("debugger:data:reducers");

import { combineReducers } from "redux";

import { stableKeccak256 } from "lib/helpers";

import * as actions from "./actions";

import { slotAddress } from "truffle-decoder";
import { Conversion, EVM } from "truffle-decode-utils";

const DEFAULT_SCOPES = {
  byId: {}
};

function scopes(state = DEFAULT_SCOPES, action) {
  var scope;
  var variables;

  switch (action.type) {
    case actions.SCOPE:
      scope = state.byId[action.id] || {};

      return {
        byId: {
          ...state.byId,

          [action.id]: {
            ...scope,

            id: action.id,
            sourceId: action.sourceId,
            parentId: action.parentId,
            pointer: action.pointer
          }
        }
      };

    case actions.DECLARE:
      scope = state.byId[action.node.scope] || {};
      variables = scope.variables || [];

      return {
        byId: {
          ...state.byId,

          [action.node.scope]: {
            ...scope,

            variables: [
              ...variables,

              { name: action.node.name, id: action.node.id }
            ]
          }
        }
      };

    default:
      return state;
  }
}

//a note on the following reducer: solidity assigns a unique AST ID to every
//AST node among all the files being compiled together.  thus, it is, for now,
//safe to identify user-defined types solely by their AST ID.  In the future,
//once we eventually support having some files compiled separately from others,
//this will become a bug you'll have to fix, and you'll have to fix it in the
//decoder, too.  Sorry, future me! (or whoever's stuck doing this)

function userDefinedTypes(state = [], action) {
  switch (action.type) {
    case actions.DEFINE_TYPE:
      return [...state, action.node.id];
    default:
      return state;
  }
}

function storage(state = {}, action) {
  if (action.type === actions.ALLOCATE) {
    return action.storage;
  } else {
    return state;
  }
}

const allocations = combineReducers({
  storage
});

const info = combineReducers({
  scopes,
  userDefinedTypes,
  allocations
});

const DEFAULT_ASSIGNMENTS = {
  byId: {},
  byAstId: {}
};

function assignments(state = DEFAULT_ASSIGNMENTS, action) {
  switch (action.type) {
    case actions.ASSIGN:
    case actions.MAP_PATH_AND_ASSIGN:
      debug("action.assignments %O", action.assignments);
      return Object.values(action.assignments.byId).reduce(
        (acc, assignment) => {
          let { id, astId } = assignment; //we don't need the rest
          return {
            byId: {
              ...acc.byId,
              [id]: assignment
            },
            byAstId: {
              ...acc.byAstId,
              [astId]: [...new Set([...(acc.byAstId[astId] || []), id])]
              //we use a set for uniqueness
            }
          };
        },
        state
      );

    case actions.LEARN_ADDRESS:
      let { dummyAddress, address } = action;
      return {
        byId: Object.assign(
          {},
          ...Object.values(state.byId).map(assignment => {
            let newAssignment = learnAddress(assignment, dummyAddress, address);
            return {
              [newAssignment.id]: newAssignment
            };
          })
        ),
        byAstId: Object.assign(
          {},
          ...Object.entries(state.byAstId).map(([astId]) => {
            return {
              [astId]: state.byAstId[astId].map(
                id => learnAddress(state.byId[id], dummyAddress, address).id
                //this above involves some recomputation but oh well
              )
            };
          })
        )
      };

    case actions.RESET:
      return DEFAULT_ASSIGNMENTS;

    default:
      return state;
  }
}

function learnAddress(assignment, dummyAddress, address) {
  if (assignment.dummyAddress === dummyAddress) {
    //we can assume here that the object being
    //transformed has a very particular form
    let newIdObj = {
      astId: assignment.astId,
      address
    };
    let newId = stableKeccak256(newIdObj);
    return {
      id: newId,
      ref: assignment.ref,
      astId: assignment.astId,
      address
    };
  } else {
    return assignment;
  }
}

const DEFAULT_PATHS = {
  decodingStarted: 0,
  byAddress: {},
  byId: {} //WARNING: byId is *working* state and should not be relied on
  //aside from its narrow purpose of avoiding recomputation in the data saga
};

//WARNING: do *not* rely on mappedPaths to keep track of paths that do not
//involve mapping keys!  Yes, many will get mapped, but there is no guarantee.
//Only when mapping keys are involved does it necessarily work reliably --
//which is fine, as that's all we need it for.
function mappedPaths(state = DEFAULT_PATHS, action) {
  switch (action.type) {
    case actions.MAP_KEY_DECODING:
      debug(
        "decoding started: %d",
        state.decodingStarted + (action.started ? 1 : -1)
      );
      return {
        decodingStarted: state.decodingStarted + (action.started ? 1 : -1),
        byAddress: state.byAddress,
        byId: state.byId
      };
    case actions.MAP_PATH_AND_ASSIGN:
      let { address, slot, assignments } = action;

      //assignments.byId should contain precisely one assignment; we'll just
      //need its ID, which is its key
      let id = Object.keys(assignments.byId)[0];

      debug("slot %o", slot);
      let hexSlotAddress = Conversion.toHexString(
        slotAddress(slot),
        EVM.WORD_SIZE
      );
      let parentAddress = slot.path
        ? Conversion.toHexString(slotAddress(slot.path), EVM.WORD_SIZE)
        : undefined;

      //this is going to be messy and procedural, sorry.  but let's start with
      //the easy stuff: create the new address if needed, clone if not,
      //and set up byId regardless
      let newState = {
        decodingStarted: state.decodingStarted,
        byAddress: {
          ...state.byAddress,
          [address]: {
            ...(state.byAddress[address] || {})
          }
        },
        byId: {
          ...state.byId,
          [id]: { address, slotAddress: hexSlotAddress }
        }
      };

      //now: are we just adding, doing nothing (except to byId), or are we
      //going to have to do a relink?
      let oldInfo = newState.byAddress[address][hexSlotAddress];
      //yes, this looks strange, but we haven't changed it yet except to
      //clone or create empty (and we don't want undefined!)
      if (oldInfo === undefined) {
        //case 1: just add -- but note that if the parent is already present,
        //use that instead of the given parent!
        let newSlot;
        if (
          parentAddress !== undefined &&
          newState.byAddress[address][parentAddress]
        ) {
          newSlot = {
            ...slot,
            path: newState.byAddress[address][parentAddress].slot
          };
        } else {
          newSlot = slot;
        }
        newState.byAddress[address][hexSlotAddress] = {
          slot: newSlot,
          children: []
        };
      } else if (pathLength(oldInfo.slot) < pathLength(slot)) {
        //case 2: we need to do a relink
        //NOTE: this should only happen when pathLength(oldInfo.slot) == 0
        //i.e. oldInfo.slot.path === undefined
        //so I am going to make that assumption
        //first, let's add ourselves to our parent's children
        //(we clone a bunch to avoid mutating state)
        //note that parentAddress is guaranteed to be defined in this case
        newState.byAddress[address][parentAddress] = {
          ...state.byAddress[address][parentAddress],
          children: [
            ...state.byAddress[address][parentAddress].children,
            slotAddress
          ]
        };
        //now, let's redo the actual slot with our new path
        newState.byAddress[address][hexSlotAddress] = {
          slot,
          children: state.byAddress[address][hexSlotAddress].children
        };
        //now, we perform the relink!
        newState.byAddress[address] = relink(
          newState.byAddress[address],
          hexSlotAddress
        );
      }
      //case 3: we don't need to do anything (except update byId which we
      //already did)

      return newState;

    case actions.RESET:
      return DEFAULT_PATHS;

    case actions.LEARN_ADDRESS:
      return {
        decodingStarted: state.decodingStarted,
        byAddress: Object.assign(
          {},
          ...Object.entries(state.byAddress).map(([address, slots]) => ({
            [address === actions.dummyAddress ? action.adress : address]: slots
          }))
        ),
        byId: Object.assign(
          {},
          ...Object.entries(state.byId).map(
            ([id, { address, slotAddress }]) => ({
              //note that the ID does *not* need to change here, as it comes
              //from a stackframe assignment, not an address assignment
              [id]: {
                address:
                  address === action.dummyAddress ? action.address : address,
                slotAddress
              }
            })
          )
        )
      };

    default:
      return state;
  }
}

function pathLength(slot) {
  if (slot.path === undefined) return 0;
  return 1 + pathLength(slot.path);
}

function relink(slotMap, startAddress) {
  let children = slotMap[startAddress].children;
  let newSlotMap = { ...slotMap }; //we don't want to mutate slotMap
  for (childAddress of children) {
    newSlotMap[childAddress] = {
      ...newSlotMap[childAddress],
      slot: {
        ...newSlotMap[childAddress].slot,
        path: newsSlotMap[startAddress].slot
      }
    };
    newSlotMap = relink(newSlotMap, childAddress);
  }
  return newSlotMap;
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
