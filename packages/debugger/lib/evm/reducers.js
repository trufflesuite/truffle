import debugModule from "debug";
const debug = debugModule("debugger:evm:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";
import * as Codec from "@truffle/codec";

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
        context,
        contractName,
        binary,
        sourceMap,
        primarySource,
        immutableReferences,
        compiler,
        compilationId,
        abi,
        contractId,
        contractKind,
        isConstructor,
        linearizedBaseContracts
      } = action;
      debug("action %O", action);

      return {
        ...state,
        byContext: {
          ...state.byContext,
          [context]: {
            context,
            contractName,
            context,
            binary,
            sourceMap,
            primarySource,
            immutableReferences,
            compiler,
            compilationId,
            abi,
            contractId,
            contractKind,
            isConstructor,
            linearizedBaseContracts,
            payable: Codec.AbiData.Utils.abiHasPayableFallback(abi)
          }
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
  contexts
});

const DEFAULT_TX = {
  gasprice: new BN(0),
  origin: Codec.Evm.Utils.ZERO_ADDRESS
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
  coinbase: Codec.Evm.Utils.ZERO_ADDRESS,
  difficulty: new BN(0),
  gaslimit: new BN(0),
  number: new BN(0),
  timestamp: new BN(0),
  chainid: new BN(0)
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

function status(state = null, action) {
  switch (action.type) {
    case actions.SAVE_STATUS:
      return action.status;
    case actions.UNLOAD_TRANSACTION:
      return null;
    default:
      return state;
  }
}

function initialCall(state = null, action) {
  switch (action.type) {
    case actions.CALL:
    case actions.CREATE:
      //we only want to save the initial call, so return
      //the current state if it's not null
      if (state !== null) {
        return state;
      } else {
        //we'll just store the action itself in the state
        return action;
      }
    case actions.UNLOAD_TRANSACTION:
      return null;
    default:
      return state;
  }
}

const DEFAULT_AFFECTED_INSTANCES = { byAddress: {} };

function affectedInstances(state = DEFAULT_AFFECTED_INSTANCES, action) {
  switch (action.type) {
    case actions.ADD_AFFECTED_INSTANCE:
      const {
        address,
        binary,
        context,
        creationBinary,
        creationContext
      } = action;
      return {
        byAddress: {
          ...state.byAddress,
          [address]: {
            address,
            binary,
            context,
            creationBinary, //may be undefined
            creationContext
          }
        }
      };
    case actions.UNLOAD_TRANSACTION:
      return DEFAULT_AFFECTED_INSTANCES;
    default:
      return state;
  }
}

const transaction = combineReducers({
  globals,
  status,
  initialCall,
  affectedInstances
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

    case actions.RETURN_CALL:
    case actions.RETURN_CREATE:
    case actions.FAIL:
      //pop the stack... unless (HACK) that would leave it empty (this will
      //only happen at the end when we want to keep the last one around)
      return state.length > 1 ? state.slice(0, -1) : state;

    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return [];

    default:
      return state;
  }
}

const DEFAULT_CODEX = [
  {
    accounts: {}
    //will be more here in the future!
  }
];

function codex(state = DEFAULT_CODEX, action) {
  let newState, topCodex;

  const updateFrameStorage = (frame, address, slot, value) => ({
    ...frame,
    accounts: {
      ...frame.accounts,
      [address]: {
        code: "0x", //this will get overridden if it already exists!
        context: null, //similarly!
        ...frame.accounts[address], //may be undefined
        storage: {
          ...(frame.accounts[address] || {}).storage, //may be undefined
          [slot]: value
        }
      }
    }
  });
  //(note that {...undefined} just expands to {} and is OK)

  const updateFrameCode = (frame, address, code, context) => {
    let existingPage = frame.accounts[address] || { storage: {} };
    return {
      ...frame,
      accounts: {
        ...frame.accounts,
        [address]: {
          ...existingPage,
          code: code,
          context: context
        }
      }
    };
  };

  //later: will add "force" parameter
  const safePop = array => (array.length > 2 ? array.slice(0, -1) : array);

  //later: will add "force" parameter
  const safeSave = array =>
    array.length > 2
      ? array.slice(0, -2).concat([array[array.length - 1]])
      : array;

  switch (action.type) {
    case actions.CALL:
      debug("call action");
      debug("codex: %O", state);
      //on a call, we can just make a new stackframe by cloning the top
      //stackframe; there should already be an account for the address we're
      //calling into, so we don't need to make one
      return [...state, state[state.length - 1]];

    case actions.CREATE:
      debug("create action");
      //on a create, make a new stackframe, then add a new pages to the
      //codex if necessary; don't add a zero page though (or pages that already
      //exist)

      //first, add a new stackframe by cloning the top one
      newState = [...state, state[state.length - 1]];
      topCodex = newState[newState.length - 1];
      //now, do we need to add a new address to this stackframe?
      if (
        topCodex.accounts[action.storageAddress] !== undefined ||
        action.storageAddress === Codec.Evm.Utils.ZERO_ADDRESS
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
            storage: {},
            code: "0x",
            context: null
            //there will be more here in the future!
          }
        }
      };
      return newState;

    case actions.STORE: {
      debug("store action");
      //on a store, the relevant page should already exist, so we can just
      //add or update the needed slot
      const { address, slot, value } = action;
      if (address === Codec.Evm.Utils.ZERO_ADDRESS) {
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
      debug("load action");
      //loads are a little more complicated -- usually we do nothing, but if
      //it's an external load (there was nothing already there), then we want
      //to update *every* stackframe
      const { address, slot, value } = action;
      if (address === Codec.Evm.Utils.ZERO_ADDRESS) {
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

    case actions.RETURN_CALL:
      debug("return from call");
      //we want to pop the top while making the new top a copy of the old top;
      //that is to say, we want to drop just the element *second* from the top
      //NOTE: we don't ever go down to 1 element!
      return safeSave(state);

    case actions.RETURN_CREATE: {
      debug("return from create");
      //we're going to do the same things in this case as in the usual return
      //case, but first we need to record the code that was returned
      const { address, code, context } = action;
      newState = state.slice(); //clone the state
      //NOTE: since this is only for RETURN_CREATE, and not FAIL, we shouldn't
      //have to worry about accidentally getting a zero address here
      newState[newState.length - 1] = updateFrameCode(
        newState[newState.length - 1],
        address,
        code,
        context
      );
      debug("newState: %O", newState);
      return safeSave(newState);
    }

    case actions.FAIL:
      debug("fail action");
      //pop the stack
      //NOTE: we don't ever go down to 1 element!
      return safePop(state);

    case actions.RESET:
      debug("reset action");
      return [state[0]]; //leave the -1 frame on the stack

    case actions.UNLOAD_TRANSACTION:
      debug("unload action");
      return DEFAULT_CODEX;

    case actions.ADD_INSTANCE: {
      //add the instance to every frame
      //(this is a little HACKy, but it *should* be fine)
      debug("adding instance");
      const { address, binary, context } = action;
      return state.map(frame =>
        updateFrameCode(frame, address, binary, context)
      );
    }

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
