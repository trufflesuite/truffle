import { combineReducers } from "redux";

import * as actions from "./actions";
import { keccak256 } from "lib/helpers";
import * as DecodeUtils from "truffle-decode-utils";

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
      const { contractName, raw, compiler } = action;
      const context = keccak256(raw);

      return {
        ...state,

        byContext: {
          ...state.byContext,

          [context]: {
            ...(state.byContext[context] || {}),

            contractName,
            context,
            compiler
          }
        }
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
};

function instances(state = DEFAULT_INSTANCES, action) {
  switch (action.type) {
    /*
     * Adding a new address for context
     */
    case actions.ADD_INSTANCE:
      let { address, context, binary } = action;

      // get known addresses for this context
      let otherInstances = state.byContext[context] || [];
      let otherAddresses = otherInstances.map(({ address }) => address);

      return {
        byAddress: {
          ...state.byAddress,

          [address]: { address, context, binary }
        },

        byContext: {
          ...state.byContext,

          // reconstruct context instances to include new address
          [context]: Array.from(new Set(otherAddresses).add(address)).map(
            address => ({ address })
          )
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
  switch (action.type) {
    case actions.CALL: {
      const { address, data, storageAddress } = action;
      return state.concat([{ address, data, storageAddress }]);
    }

    case actions.CREATE: {
      const { binary, storageAddress } = action;
      return state.concat([{ binary, data: "0x", storageAddress }]);
      //note: the empty data for creation calls doesn't matter right now, but
      //it will once I implement globally available variables
    }

    case actions.RETURN:
      //HACK: pop the stack, UNLESS that would leave it empty (this will only
      //happen at the end when we want to keep the last one around)
      return state.length > 1 ? state.slice(0, -1) : state;

    case actions.RESET:
      return [state[0]]; //leave the initial call still on the stack

    default:
      return state;
  }
}

//default codex with nothing
const DEFAULT_CODEX = {
  byAddress: {}
  //there will be more here later!
};

//default codex with a single address
function defaultCodex(address) {
  return {
    byAddress: {
      [address]: {
        storage: {}
        //there will be more here later!
      }
    }
  };
}

export function codex(state = DEFAULT_CODEX, action) {
  switch (action.type) {
    case actions.CALL:
    case actions.CREATE:
      //on a call or create, add new pages to the codex if necessary;
      //don't add a zero page though (or pages that already exist)
      if (
        state.byAddress[action.storageAddress] !== undefined ||
        action.storageAddress === DecodeUtils.EVM.ZERO_ADDRESS
      ) {
        return state;
      }
      return {
        ...state,
        byAddress: {
          ...state.byAddress,
          [action.storageAddress]: {
            storage: {}
            //there will be more here later!
          }
        }
      };
    case actions.STORE:
      //on a store, the relevant page should already exist, so we can just
      //add or update the needed slot
      const { address, slot, value } = action;
      return {
        ...state,
        byAddress: {
          ...state.byAddress,
          [address]: {
            ...state.byAddress[address],
            storage: {
              ...state.byAddress[address].storage,
              [slot]: value
            }
          }
        }
      };
    case actions.RESET:
      return defaultCodex(action.storageAddress);
    default:
      return state;
  }
}

const proc = combineReducers({
  callstack,
  codex
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
