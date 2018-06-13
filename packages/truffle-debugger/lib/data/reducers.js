import debugModule from "debug";
const debug = debugModule("debugger:data:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

const DEFAULT_SCOPES = {
  byId: {}
};

function scopes(state = DEFAULT_SCOPES, action) {
  var context;
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
      }

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

              {name: action.node.name, id: action.node.id}
            ]
          }
        }
      }

    default:
      return state;
  }
}

const info = combineReducers({
  scopes
});

const DEFAULT_ASSIGNMENTS = {
  byId: {}
};

function assignments(state = DEFAULT_ASSIGNMENTS, action) {
  switch (action.type) {
    case actions.ASSIGN:
      return {
        byId: {
          ...state.byId,

          ...Object.assign({},
            ...Object.entries(action.assignments).map(
              ([id, ref]) => ({
                [id]: {
                  ...state.byId[id],
                  ref
                }
              })
            )
          )
        }
      };

    default:
      return state;
  }
};

const proc = combineReducers({
  assignments
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
