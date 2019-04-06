import debugModule from "debug";
const debug = debugModule("debugger:evm:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";
import { keccak256, extractPrimarySource } from "lib/helpers";
import * as DecodeUtils from "truffle-decode-utils";
import escapeRegExp from "lodash.escaperegexp";

import BN from "bn.js";

function contexts(state = {}, action) {
  switch (action.type) {
    /*
     * Adding a new context
     */
    case actions.ADD_CONTEXT: {
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
      };
    }

    case actions.NORMALIZE_CONTEXTS: {
      //unfortunately, due to our current link references format, we can't
      //really use the binary frm the artifact directly -- neither for purposes
      //of matching, nor for purposes of decoding internal functions.  So, we
      //need to perform this normalization step on our contexts before using
      //them.  Once we have truffle-db, this step should largely go away.

      debug("normalizing contexts");

      //first, let's clone the state; we're going to make some deep modifications,
      //so we'll want more than a shallow clone here
      let newState = Object.assign(
        {},
        ...Object.entries(state).map(([id, context]) => ({
          [id]: {
            ...context
          }
        }))
      );

      debug("state cloned");

      //next, we get all the contract names and sort them descending by length.
      //We're going to want to go in descending order of length so that we
      //don't run into problems when one name is a substring of another.
      //For simplicity, we'll exclude names of length <38, because we can
      //handle these with our more general check for link references at the end
      const fillerLength = 2 * DecodeUtils.EVM.ADDRESS_SIZE;
      let names = Object.values(state)
        .map(context => context.contractName)
        .filter(name => name.length >= fillerLength - 3)
        //the -3 is for 2 leading underscores and 1 trailing
        .sort((name1, name2) => name2.length - name1.length);

      debug("names sorted");

      //now, we need to turn all these names into regular expressions, because,
      //unfortunately, str.replace() will only replace all if you use a /g regexp;
      //note that because names may contain '$', we need to escape them
      //(also we prepend "__" because that's the placeholder format)
      let regexps = names.map(
        name => new RegExp(escapeRegExp("__" + name), "g")
      );

      debug("regexps prepared");

      //having done so, we can do the replace for these names!
      const replacement = ".".repeat(fillerLength);
      for (let regexp of regexps) {
        for (let context of Object.values(newState)) {
          context.binary = context.binary.replace(regexp, replacement);
        }
      }

      debug("long replacements complete");

      //now we can do a generic replace that will catch all names of length
      //<40, while also catching the Solidity compiler's link reference format
      //as well as Truffle's.  Hooray!
      const genericRegexp = new RegExp("_.{" + (fillerLength - 2) + "}_", "g");
      //we're constructing the regexp /_.{38}_/g, but I didn't want to use a
      //literal 38 :P
      for (let context of Object.values(newState)) {
        context.binary = context.binary.replace(genericRegexp, replacement);
      }

      debug("short replacements complete");
      //but there's one more step -- libraries' deployedBytecode will include
      //0s in place of their own address instead of a link reference at the
      //beginning, so we need to account for that too
      const pushAddressInstruction = (
        0x60 +
        DecodeUtils.EVM.ADDRESS_SIZE -
        1
      ).toString(16); //"73"
      for (let context of Object.values(newState)) {
        if (context.contractKind === "library" && !context.isConstructor) {
          context.binary = context.binary.replace(
            "0x" +
              pushAddressInstruction +
              "00".repeat(DecodeUtils.EVM.ADDRESS_SIZE),
            "0x" + pushAddressInstruction + replacement
          );
        }
      }

      debug("extra library replacements complete");

      //finally, return this mess!
      return newState;
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

const DEFAULT_TX = {
  gasprice: new BN(0),
  origin: DecodeUtils.EVM.ZERO_ADDRESS
};

function tx(state = DEFAULT_TX, action) {
  if (action.type === actions.SAVE_GLOBALS) {
    let { gasprice, origin } = action;
    return { gasprice, origin };
  } else {
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
  if (action.type === actions.SAVE_GLOBALS) {
    debug("action %O", action);
    return action.block;
  } else {
    return state;
  }
}

const globals = combineReducers({
  tx,
  block
});

const info = combineReducers({
  contexts,
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
