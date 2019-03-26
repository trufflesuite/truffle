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
    case actions.FAIL:
      //pop the stack... unless (HACK) that would leave it empty (this will
      //only happen at the end when we want to keep the last one around)
      return state.length > 1 ? state.slice(0, -1) : state;

    case actions.RESET:
      return [state[0]]; //leave the initial call still on the stack

    default:
      return state;
  }
}

//default codex stackframe with a single address (or none if address not
//supplied)
function defaultCodexFrame(address) {
  if (address !== undefined) {
    return {
      //there will be more here in the future!
      accounts: {
        [address]: {
          //there will be more here in the future!
          storage: {}
        }
      }
    };
  } else {
    return {
      //there will be more here in the future!
      accounts: {}
    };
  }
}

export function codex(state = [], action) {
  let newState, topCodex;

  const updateFrameStorage = (frame, address, slot, value) => {
    if (address === DecodeUtils.EVM.ZERO_ADDRESS) {
      //we do not maintain a zero page! we leave that alone!
      return frame;
    }
    let existingPage = frame.accounts[address] || { storage: {} };
    return {
      ...frame,
      accounts: {
        ...frame.accounts,
        [address]: {
          ...existingPage,
          storage: {
            ...existingPage.storage,
            [slot]: value
          }
        }
      }
    };
  };

  switch (action.type) {
    case actions.CALL:
    case actions.CREATE:
      //on a call or create, make a new stackframe, then add a new pages to the
      //codex if necessary; don't add a zero page though (or pages that already
      //exist)

      //first, add a new stackframe; if there's an existing stackframe, clone
      //that, otherwise make one from scratch
      newState =
        state.length > 0
          ? [...state, state[state.length - 1]]
          : [defaultCodexFrame()];
      topCodex = newState[newState.length - 1];
      //now, do we need to add a new address to this stackframe?
      if (
        topCodex.accounts[action.storageAddress] !== undefined ||
        action.storageAddress === DecodeUtils.EVM.ZERO_ADDRESS
      ) {
        //if we don't
        return newState;
      }
      //if we do
      newState[newState.length - 1] = {
        ...topCodex,
        accounts: {
          ...topCodex.accounts,
          [action.storageAddress]: {
            storage: {}
            //there will be more here in the future!
          }
        }
      };
      return newState;

    case actions.STORE: {
      //on a store, the relevant page should already exist, so we can just
      //add or update the needed slot
      const { address, slot, value } = action;
      newState = state.slice(); //clone the state
      topCodex = newState[newState.length - 1];
      newState[newState.length - 1] = updateFrameStorage(
        topCodex,
        address,
        slot,
        value
      );
      return newState;
    }

    case actions.LOAD: {
      //loads are a little more complicated -- usually we do nothing, but if
      //it's an external load (there was nothing already there), then we want
      //to update *every* stackframe
      const { address, slot, value } = action;
      topCodex = state[state.length - 1];
      if (topCodex.accounts[address].storage[slot] !== undefined) {
        return state;
      } else {
        return state.map(frame =>
          updateFrameStorage(frame, address, slot, value)
        );
      }
    }

    case actions.RETURN:
      //we want to pop the top while making the new top a copy of the old top;
      //that is to say, we want to drop just the element *second* from the top
      //(although, HACK, if the stack only has one element, just leave it alone)
      return state.length > 1
        ? state.slice(0, -2).concat([state[state.length - 1]])
        : state;

    case actions.FAIL:
      //pop the stack... unless (HACK) that would leave it empty (this will
      //only happen at the end when we want to keep the last one around)
      return state.length > 1 ? state.slice(0, -1) : state;

    case actions.RESET:
      return [defaultCodexFrame(action.storageAddress)];

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
