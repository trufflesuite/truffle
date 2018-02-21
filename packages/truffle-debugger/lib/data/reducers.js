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
 *        stackAssignment: [index]
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
      context = state[action.context] || {};
      scope = context[action.id] || {};

      return {
        ...state,

        [action.context]: {
          ...context,

          [action.id]: {
            ...scope,

            parentId: action.parentId,
            pointer: action.pointer
          }
        }
      }

    case actions.DECLARE:
      context = state[action.context] || {};
      scope = context[action.node.scope] || {};
      variables = scope.variables || [];

      return {
        ...state,

        [action.context]: {
          ...context,

          [action.node.scope]: {
            ...scope,

            variables: [
              ...variables,

              {name: action.node.name, id: action.node.id}
            ]
          }
        }
      }

    case actions.ASSIGN:
      context = state[action.context] || {};
      let nodes = Object.assign(
        {}, ...Object.entries(action.assignments).map( ([id]) => ({ [id]: context[id] }))
      );

      return {
        ...state,

        [action.context]: {
          ...context,

          ...Object.assign(
            {}, ...Object.entries(action.assignments).map( ([id, stackIndex]) => ({
              [id]: {
                ...context[id],
                stackIndex
              }
            }))
          )
        }
      };

    default:
      return state;
  }
};
