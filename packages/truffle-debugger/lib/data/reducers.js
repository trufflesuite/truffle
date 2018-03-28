import debugModule from "debug";
const debug = debugModule("debugger:data:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

/*
 * state shape
 * -----------
 *
 *  data: {
 *    [context-id]: {
 *      [scope-id]: {
 *        pointer: "/json/pointer",
 *        variables: {
 *          name: <name>,
 *          id: <id>,
 *        }
 *      },
 *
 *      [var-id]: {
 *        pointer: "/json/pointer",
 *        ref: { [segment]: [location] }
 *      }
 *    }
 *  }
 */

export default function reducer(state = {}, action) {
  var context;
  var scope;
  var variables;

  switch (action.type) {
    case actions.SCOPE:
      scope = state[action.id] || {};

      return {
        ...state,


        [action.id]: {
          ...scope,

          sourceId: action.sourceId,
          parentId: action.parentId,
          pointer: action.pointer
        }
      }

    case actions.DECLARE:
      scope = state[action.node.scope] || {};
      variables = scope.variables || [];

      return {
        ...state,

        [action.node.scope]: {
          ...scope,

          variables: [
            ...variables,

            {name: action.node.name, id: action.node.id}
          ]
        }
      }

    case actions.ASSIGN:
      let nodes = Object.assign({},
        ...Object.entries(action.assignments).map(
          ([id]) => ({ [id]: state[id] })
        )
      );

      return {
        ...state,

        ...Object.assign({},
          ...Object.entries(action.assignments).map(
            ([id, ref]) => ({
              [id]: {
                ...state[id],
                ref
              }
            })
          )
        )
      };

    default:
      return state;
  }
};
