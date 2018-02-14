import { combineReducers } from "redux";

import * as actions from "./actions";

/*
 * state shape
 * -----------
 *
 *  data: {
 *    [context-id]: {
 *      [scope]: {
 *        pointer: "/json/pointer",
 *        variables: {
 *          [identifier]: {
 *            type: <type>,
 *            pointer: <pointer>
 *          }
 *        }
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

    default:
      return state;
  }
};
