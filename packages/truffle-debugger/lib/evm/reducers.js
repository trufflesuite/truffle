import debugModule from "debug";
const debug = debugModule("debugger:evm:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";
import { keccak256, extractPrimarySource } from "lib/helpers";
import * as DecodeUtils from "truffle-decode-utils";

import BN from "bn.js";

const DEFAULT_CONTEXTS = {
  byContext: {}
};

function contexts(state = DEFAULT_CONTEXTS, action) {
  switch (action.type) {
    /*
     * Adding a new context
     */
    case actions.ADD_CONTEXT:
      const {
        contractName,
        binary,
        sourceMap,
        compiler,
        abi,
        contractId,
        contractKind,
        isConstructor
      } = action;
      debug("action %O", action);
      //NOTE: we take hash as *string*, not as bytes, because the binary may
      //contain link references!
      const context = keccak256({ type: "string", value: binary });
      let primarySource;
      if (sourceMap !== undefined) {
        primarySource = extractPrimarySource(sourceMap);
      }
      //otherwise leave it undefined

      return {
        ...state,
        byContext: {
          ...state.byContext,
          [context]: {
            contractName,
            context,
            binary,
            sourceMap,
            primarySource,
            compiler,
            abi,
            contractId,
            contractKind,
            isConstructor
          }
        }
      };

    case actions.NORMALIZE_CONTEXTS:
      return {
        byContext: DecodeUtils.Contexts.normalizeContexts(state.byContext)
      };

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
    case actions.UNLOAD_TRANSACTION:
      return DEFAULT_INSTANCES;

    /*
     * Default case
     */
    default:
      return state;
  }
}

const DEFAULT_TX = {
  gasprice: new BN(0),
  origin: DecodeUtils.EVM.ZERO_ADDRESS
};

function tx(state = DEFAULT_TX, action) {
  switch (action.type) {
    case actions.SAVE_GLOBALS:
      let { gasprice, origin } = action;
      return { gasprice, origin };
    case actions.UNLOAD_TRANSACTION:
      return DEFAULT_TX;
    default:
      return state;
  }
}

const DEFAULT_BLOCK = {
  coinbase: DecodeUtils.EVM.ZERO_ADDRESS,
  difficulty: new BN(0),
  gaslimit: new BN(0),
  number: new BN(0),
  timestamp: new BN(0)
};

function block(state = DEFAULT_BLOCK, action) {
  switch (action.type) {
    case actions.SAVE_GLOBALS:
      return action.block;
    case actions.UNLOAD_TRANSACTION:
      return DEFAULT_BLOCK;
    default:
      return state;
  }
}

const globals = combineReducers({
  tx,
  block
});

const info = combineReducers({
  contexts
});

const transaction = combineReducers({
  instances,
  globals
});

function callstack(state = [], action) {
  switch (action.type) {
    case actions.CALL: {
      const { address, data, storageAddress, sender, value } = action;
      return state.concat([{ address, data, storageAddress, sender, value }]);
    }

    case actions.CREATE: {
      const { binary, storageAddress, sender, value } = action;
      return state.concat(
        [{ binary, data: "0x", storageAddress, sender, value }]
        //the empty data field is to make msg.data and msg.sig come out right
      );
    }

    case actions.RETURN:
    case actions.FAIL:
      //pop the stack... unless (HACK) that would leave it empty (this will
      //only happen at the end when we want to keep the last one around)
      return state.length > 1 ? state.slice(0, -1) : state;

    case actions.RESET:
      return [state[0]]; //leave the initial call still on the stack

    case actions.UNLOAD_TRANSACTION:
      return [];

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

function codex(state = [], action) {
  let newState, topCodex;

  const updateFrameStorage = (frame, address, slot, value) => {
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
      if (address === DecodeUtils.EVM.ZERO_ADDRESS) {
        //as always, we do not maintain a zero page
        return state;
      }
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
      if (address === DecodeUtils.EVM.ZERO_ADDRESS) {
        //as always, we do not maintain a zero page
        return state;
      }
      topCodex = state[state.length - 1];
      if (topCodex.accounts[address].storage[slot] !== undefined) {
        //if we already have a value in the *top* stackframe, update *no*
        //stackframes; don't update the top (no need, it's just a load, not a
        //store), don't update the rest (that would be wrong, you might be
        //loading a value that will get reverted later)
        return state;
      } else {
        //if we *don't* already have a value in the top stackframe, that means
        //we're loading a value from a previous transaction!  That's not a
        //value that will get reverted if this call fails, so update *every*
        //stackframe
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

    case actions.UNLOAD_TRANSACTION:
      return [];

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
  transaction,
  proc
});

export default reducer;
