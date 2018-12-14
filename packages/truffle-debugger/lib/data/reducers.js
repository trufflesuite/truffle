import debugModule from "debug";
const debug = debugModule("debugger:data:reducers");

import { combineReducers } from "redux";

import { stableKeccak256 } from "lib/helpers";

import { Allocation } from "truffle-decode-utils";

import * as actions from "./actions";

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

//a note on the following two reducers: solidity assigns a unique AST ID to
//every AST node among all the files being compiled together.  thus, it is, for
//now, safe to identify user-defined types solely by their AST ID.  In the
//future, once we eventually support having some files compiled separately from
//others, this will become a bug you'll have to fix, and you'll have to fix it
//in the decoder, too.  Sorry, future me! (or whoever's stuck doing this)

function userDefinedTypes(state = [], action) {
  switch (action.type) {
    case DECLARE:
      const userDefinedNodeTyes =
        ["StructDefinition","NodeDefinition","ContractDefinition"];
         //note that interfaces and libraries are also ContractDefinition
      if(userDefinedNodeTypes.includes(action.node.nodeType)) {
        return [...state, action.node.id];
      }
      else {
        return state;
      }
    default:
      return state;
  }
}

function allocations(state = {}, action) {
  switch (action.type) {
    case COMPUTE_ALLOCATIONS:
      let allocations = {};
      for(id of action.types) {
        let variables = action.refs[id].variables;
        let allocation = Allocation.allocateDeclarations(variables, refs,
          allocations);
        allocations[id] = allocation;
      }
      return allocations;
    default:
      return state;
}

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
          ...Object.entries(state.byId).map(([, assignment]) => {
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

const DEFAULT_MAPPING_KEYS = {
  decodingStarted: 0,
  byId: {}
};

function mappingKeys(state = DEFAULT_MAPPING_KEYS, action) {
  switch (action.type) {
    case actions.MAP_KEY_DECODING:
      debug(
        "decoding started: %d",
        state.decodingStarted + (action.started ? 1 : -1)
      );
      return {
        decodingStarted: state.decodingStarted + (action.started ? 1 : -1),
        byId: { ...state.byId }
      };
    case actions.MAP_KEY:
      let { id, key } = action;
      debug("mapping id and key: %s, %o", id, key);

      return {
        decodingStarted: state.decodingStarted,
        byId: {
          ...state.byId,

          // add new key to set of keys already defined
          [id]: [
            ...new Set([
              //set for uniqueness
              ...(state.byId[id] || []),
              key
            ])
          ]
        }
      };

    case actions.RESET:
      return DEFAULT_MAPPING_KEYS;

    default:
      return state;
  }
}

const proc = combineReducers({
  assignments,
  mappingKeys
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
