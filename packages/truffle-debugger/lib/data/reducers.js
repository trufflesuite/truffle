import debugModule from "debug";
const debug = debugModule("debugger:data:reducers"); // eslint-disable-line no-unused-vars

import { combineReducers } from "redux";

import { stableKeccak256 } from "lib/helpers";

import * as actions from "./actions";

const DEFAULT_SCOPES = {
  byId: {}
};

function scopes(state = DEFAULT_SCOPES, action) {
  let scope, variables;

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

const info = combineReducers({
  scopes
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
          ...Object.entries(state.byId).map(([assignment]) => {
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
  byId: {}
};

function mappingKeys(state = DEFAULT_MAPPING_KEYS, action) {
  switch (action.type) {
    case actions.MAP_KEY:
      let { id, key } = action;

      return {
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
