import { combineReducers } from "redux";

import * as actions from "./actions";
import { keccak256 } from "lib/helpers";

const DEFAULT_CONTEXTS = {
  byContext: {},
  byBinary: {}
};

function contexts(state = DEFAULT_CONTEXTS, action) {
  switch (action.type) {
    /*
     * Adding a new context
     */
    case actions.ADD_CONTEXT: {
      const { contractName, raw } = action;
      const context = keccak256(raw);

      return {
        ...state,

        byContext: {
          ...state.byContext,

          [context]: {
            ...(state.byContext[context] || {}),

            contractName, context
          }
        },
      };
    }

    /*
     * Adding binary for a context
     */
    case actions.ADD_BINARY: {
      const { context, binary } = action;

      if (state.byBinary[binary]) {
        return state;
      }

      return {
        byContext: {
          ...state.byContext,

          [context]: {
            ...state.byContext[context],

            binary
          }
        },

        byBinary: {
          ...state.byBinary,

          [binary]: { context: context }
        }
      };
    }

    /*
     * Default case
     */
    default:
      return state;
  }
}

const DEFAULT_INSTANCES = {
  byAddress: {},
  byContext: {}
}

function instances(state = DEFAULT_INSTANCES, action) {
  switch (action.type) {
    /*
     * Adding a new address for context
     */
    case actions.ADD_INSTANCE:
      let { address, context, binary } = action;

      // get known addresses for this context
      let otherInstances = state.byContext[context] || [];
      let otherAddresses = otherInstances.map(({address}) => address);

      return {
        byAddress: {
          ...state.byAddress,

          [address]: { address, context, binary }
        },

        byContext: {
          ...state.byContext,

          // reconstruct context instances to include new address
          [context]: Array.from(new Set(otherAddresses).add(address))
            .map((address) => ({address}))
        }
      };

    /*
     * Default case
     */
    default:
      return state;
  }

}

const info = combineReducers({
  contexts,
  instances
});

export function callstack(state = [], action) {
  switch(action.type) {
    case actions.CALL:
      let address = action.address;
      return state.concat([ {address} ]);

    case actions.CREATE:
      const binary = action.binary;
      return state.concat([ {binary} ]);

    case actions.RETURN:
      return state.slice(0, -1); // pop

    default:
      return state;
  };
}

const proc = combineReducers({
  callstack
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
