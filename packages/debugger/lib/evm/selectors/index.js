import debugModule from "debug";
const debug = debugModule("debugger:evm:selectors"); // eslint-disable-line no-unused-vars

import { createSelectorTree, createLeaf } from "reselect-tree";
import BN from "bn.js";

import trace from "lib/trace/selectors";

import * as Codec from "@truffle/codec";
import {
  keccak256,
  isCallMnemonic,
  isCreateMnemonic,
  isShortCallMnemonic,
  isDelegateCallMnemonicBroad,
  isDelegateCallMnemonicStrict,
  isStaticCallMnemonic,
  isSelfDestructMnemonic
} from "lib/helpers";

const ZERO_WORD = "00".repeat(Codec.Evm.Utils.WORD_SIZE);

function determineFullContext(
  { address, binary },
  instances,
  search,
  contexts
) {
  let contextId;
  let isConstructor = Boolean(binary);
  if (address) {
    //if we're in a call to a deployed contract, we must have recorded
    //the context in the codex, so we don't need to do any further
    //searching
    ({ context: contextId, binary } = instances[address]);
  } else if (isConstructor) {
    //otherwise, if we're in a constructor, we'll need to actually do a
    //search
    contextId = search(binary);
  } else {
    //exceptional case: no transaction is loaded
    return null;
  }

  if (contextId != undefined) {
    //if we found the context, use it
    let context = contexts[contextId];
    return {
      ...context,
      binary
    };
  } else {
    //otherwise we'll construct something default
    return {
      binary,
      isConstructor
    };
  }
}

/**
 * create EVM-level selectors for a given trace step selector
 * may specify additional selectors to include
 */
function createStepSelectors(step, state = null) {
  let base = {
    /**
     * .trace
     *
     * trace step info related to operation
     */
    trace: createLeaf([step], step => {
      if (!step) {
        return null;
      }
      let { gasCost, op, pc } = step;
      return { gasCost, op, pc };
    }),

    /**
     * .programCounter
     */
    programCounter: createLeaf(["./trace"], step => (step ? step.pc : null)),

    /**
     * .isCall
     *
     * whether the opcode will switch to another calling context
     */
    isCall: createLeaf(["./trace"], step => isCallMnemonic(step.op)),

    /**
     * .isShortCall
     *
     * for calls that only take 6 arguments instead of 7
     */
    isShortCall: createLeaf(["./trace"], step => isShortCallMnemonic(step.op)),

    /**
     * .isDelegateCallBroad
     *
     * for calls that delegate storage
     */
    isDelegateCallBroad: createLeaf(["./trace"], step =>
      isDelegateCallMnemonicBroad(step.op)
    ),

    /**
     * .isDelegateCallStrict
     *
     * for calls that additionally delegate sender and value
     */
    isDelegateCallStrict: createLeaf(["./trace"], step =>
      isDelegateCallMnemonicStrict(step.op)
    ),

    /**
     * .isStaticCall
     */
    isStaticCall: createLeaf(["./trace"], step =>
      isStaticCallMnemonic(step.op)
    ),

    /**
     * .isCreate
     * (includes CREATE2)
     */
    isCreate: createLeaf(["./trace"], step => isCreateMnemonic(step.op)),

    /**
     * .isSelfDestruct
     */
    isSelfDestruct: createLeaf(["./trace"], step =>
      isSelfDestructMnemonic(step.op)
    ),

    /**
     * .isCreate2
     */
    isCreate2: createLeaf(["./trace"], step => step.op === "CREATE2"),

    /*
     * .isStore
     */
    isStore: createLeaf(["./trace"], step => step.op === "SSTORE"),

    /*
     * .isLoad
     */
    isLoad: createLeaf(["./trace"], step => step.op === "SLOAD"),

    /*
     * .touchesStorage
     *
     * whether the instruction involves storage
     */
    touchesStorage: createLeaf(
      ["./isStore", "isLoad"],
      (stores, loads) => stores || loads
    ),

    /*
     * .isPop
     * used by data
     */
    isPop: createLeaf(["./trace"], step => step.op === "POP")
  };

  if (state) {
    const isRelative = path =>
      typeof path === "string" &&
      (path.startsWith("./") || path.startsWith("../"));

    if (isRelative(state)) {
      state = `../${state}`;
    }

    Object.assign(base, {
      /**
       * .isJump
       */
      isJump: createLeaf(
        ["./trace", state],
        (step, { stack }) =>
          step.op === "JUMP" ||
          (step.op === "JUMPI" && stack[stack.length - 2] !== ZERO_WORD)
      ),

      /**
       * .valueStored
       * the storage written, as determined by looking at the stack
       * rather than at storage (since valueLoaded is now being done
       * this way, may as well do valueStored this way as well and
       * completely remove our dependence on the storage field!)
       */
      valueStored: createLeaf(["./isStore", state], (isStore, { stack }) => {
        if (!isStore) {
          return null;
        }
        return stack[stack.length - 2];
      }),

      /**
       * .callAddress
       *
       * address transferred to by call operation
       */
      callAddress: createLeaf(
        ["./isCall", state],

        (isCall, { stack }) => {
          if (!isCall) {
            return null;
          }

          let address = stack[stack.length - 2];
          return Codec.Evm.Utils.toAddress(address);
        }
      ),

      /**
       * .createBinary
       *
       * binary code to execute via create operation
       */
      createBinary: createLeaf(
        ["./isCreate", state],

        (isCreate, { stack, memory }) => {
          if (!isCreate) {
            return null;
          }

          // Get the code that's going to be created from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 2], 16) * 2;
          const length = parseInt(stack[stack.length - 3], 16) * 2;

          return (
            "0x" +
            memory
              .join("")
              .substring(offset, offset + length)
              .padEnd(length, "00")
          );
        }
      ),

      /**
       * .callData
       *
       * data passed to EVM call
       */
      callData: createLeaf(
        ["./isCall", "./isShortCall", state],
        (isCall, short, { stack, memory }) => {
          if (!isCall) {
            return null;
          }

          //if it's 6-argument call, the data start and offset will be one spot
          //higher in the stack than they would be for a 7-argument call, so
          //let's introduce an offset to handle this
          let argOffset = short ? 1 : 0;

          // Get the data from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 4 + argOffset], 16) * 2;
          const length = parseInt(stack[stack.length - 5 + argOffset], 16) * 2;

          return (
            "0x" +
            memory
              .join("")
              .substring(offset, offset + length)
              .padEnd(length, "00")
          );
        }
      ),

      /**
       * .callValue
       *
       * value for the call (not create); returns null for DELEGATECALL
       */
      callValue: createLeaf(
        ["./isCall", "./isDelegateCallStrict", "./isStaticCall", state],
        (calls, delegates, isStatic, { stack }) => {
          if (!calls || delegates) {
            return null;
          }

          if (isStatic) {
            return new BN(0);
          }

          //otherwise, for CALL and CALLCODE, it's the 3rd argument
          let value = stack[stack.length - 3];
          return Codec.Conversion.toBN(value);
        }
      ),

      /**
       * .createValue
       *
       * value for the create
       */
      createValue: createLeaf(["./isCreate", state], (isCreate, { stack }) => {
        if (!isCreate) {
          return null;
        }

        //creates have the value as the first argument
        let value = stack[stack.length - 1];
        return Codec.Conversion.toBN(value);
      }),

      /**
       * .storageAffected
       *
       * storage slot being stored to or loaded from
       * we do NOT prepend "0x"
       */
      storageAffected: createLeaf(
        ["./touchesStorage", state],

        (touchesStorage, { stack }) => {
          if (!touchesStorage) {
            return null;
          }

          return stack[stack.length - 1];
        }
      ),

      /**
       * .salt
       */
      salt: createLeaf(
        ["./isCreate2", state],

        (isCreate2, { stack }) => {
          if (!isCreate2) {
            return null;
          }

          return "0x" + stack[stack.length - 4];
        }
      ),

      /**
       * .callContext
       *
       * context of what this step is calling/creating (if applicable)
       */
      callContext: createLeaf(
        [
          "./callAddress",
          "./createBinary",
          "/current/codex/instances",
          "/info/binaries/search",
          "/info/contexts"
        ],
        (address, binary, instances, search, contexts) =>
          determineFullContext({ address, binary }, instances, search, contexts)
      )
    });
  }

  return base;
}

const evm = createSelectorTree({
  /**
   * evm.state
   */
  state: state => state.evm,

  /**
   * evm.info
   */
  info: {
    /**
     * evm.info.contexts
     */
    contexts: createLeaf(["/state"], state => state.info.contexts.byContext),

    /**
     * evm.info.binaries
     */
    binaries: {
      /**
       * evm.info.binaries.search
       *
       * returns function (binary) => context (returns the *ID* of the context)
       * (returns null on no match)
       */
      search: createLeaf(["/info/contexts"], contexts => binary =>
        //HACK: the type of contexts doesn't actually match!! fortunately
        //it's good enough to work
        (Codec.Contexts.Utils.findContext(contexts, binary) || { context: null }).context
      )
    }
  },

  /**
   * evm.transaction
   */
  transaction: {
    /**
     * evm.transaction.globals
     */
    globals: {
      /**
       * evm.transaction.globals.tx
       */
      tx: createLeaf(["/state"], state => state.transaction.globals.tx),

      /**
       * evm.transaction.globals.block
       */
      block: createLeaf(["/state"], state => state.transaction.globals.block)
    },

    /**
     * evm.transaction.status
     */
    status: createLeaf(["/state"], state => state.transaction.status),

    /**
     * evm.transaction.initialCall
     */
    initialCall: createLeaf(["/state"], state => state.transaction.initialCall),

    /**
     * evm.transaction.startingContext
     */
    startingContext: createLeaf(
      [
        "/current/callstack", //we're just getting bottom stackframe, so this is in fact tx-level
        "/current/codex/instances", //this should also be fine?
        "/info/binaries/search",
        "/info/contexts"
      ],
      (stack, instances, search, contexts) =>
        stack.length > 0
          ? determineFullContext(stack[0], instances, search, contexts)
          : null
    ),

    /**
     * evm.transaction.affectedInstances
     */
    affectedInstances: createLeaf(
      ["/state"],
      state => state.transaction.affectedInstances.byAddress
    )
  },

  /**
   * evm.current
   */
  current: {
    /**
     * evm.current.callstack
     */
    callstack: state => state.evm.proc.callstack,

    /**
     * evm.current.call
     */
    call: createLeaf(
      ["./callstack"],

      stack => (stack.length ? stack[stack.length - 1] : {})
    ),

    /**
     * evm.current.context
     */
    context: createLeaf(
      [
        "./call",
        "./codex/instances",
        "/info/binaries/search",
        "/info/contexts"
      ],
      determineFullContext
    ),

    /**
     * evm.current.state
     *
     * evm state info: as of last operation, before op defined in step
     */
    state: Object.assign(
      {},
      ...["depth", "error", "gas", "memory", "stack", "storage"].map(param => ({
        [param]: createLeaf([trace.step], step => step[param])
      }))
    ),

    /**
     * evm.current.step
     */
    step: {
      ...createStepSelectors(trace.step, "./state"),

      //the following step selectors only exist for current, not next or any
      //other step

      /**
       * evm.current.step.createdAddress
       *
       * address created by the current create step
       */
      createdAddress: createLeaf(
        [
          "./isCreate",
          "/nextOfSameDepth/state/stack",
          "./isCreate2",
          "./create2Address"
        ],
        (isCreate, stack, isCreate2, create2Address) => {
          if (!isCreate) {
            return null;
          }
          let address = stack //may be null if the create step itself fails
            ? Codec.Evm.Utils.toAddress(stack[stack.length - 1])
            : Codec.Evm.Utils.ZERO_ADDRESS; //nothing got created, so...
          if (address === Codec.Evm.Utils.ZERO_ADDRESS && isCreate2) {
            return create2Address;
          }
          return address;
        }
      ),

      /**
       * evm.current.step.create2Address
       *
       * address created by the current create2 step
       * (computed, not read off the return)
       */
      create2Address: createLeaf(
        ["./isCreate2", "./createBinary", "../call", "../state/stack"],
        (isCreate2, binary, { storageAddress }, stack) =>
          isCreate2
            ? Codec.Evm.Utils.toAddress(
                "0x" +
                  keccak256({
                    type: "bytes",
                    value:
                      //slice 2's are for cutting off initial "0x" where we've prepended this
                      //0xff, then address, then salt, then code hash
                      "0xff" +
                      storageAddress.slice(2) +
                      stack[stack.length - 4] +
                      keccak256({ type: "bytes", value: binary }).slice(2)
                  }).slice(
                    2 +
                      2 *
                        (Codec.Evm.Utils.WORD_SIZE -
                          Codec.Evm.Utils.ADDRESS_SIZE)
                  )
                //slice off initial 0x and initial 12 bytes (note we've re-prepended the
                //0x at the beginning)
              )
            : null
      ),

      /**
       * evm.current.step.isInstantCallOrCreate
       *
       * are we doing a call or create for which there are no trace steps?
       * This can happen if:
       * 1. we call a precompile
       * 2. we call an externally-owned account (or other account w/no code)
       * 3. we do a call or create but the call stack is exhausted
       * 4. we attempt to transfer more ether than we have
       */
      isInstantCallOrCreate: createLeaf(
        ["./isCall", "./isCreate", "./isContextChange"],
        (calls, creates, contextChange) => (calls || creates) && !contextChange
      ),

      /**
       * evm.current.step.isContextChange
       * groups together calls, creates, halts, and exceptional halts
       */
      isContextChange: createLeaf(
        ["/current/state/depth", "/next/state/depth"],
        (currentDepth, nextDepth) => currentDepth !== nextDepth
      ),

      /**
       * evm.current.step.isNormalHalting
       */
      isNormalHalting: createLeaf(
        ["./isHalting", "./returnStatus"],
        (isHalting, status) => isHalting && status
      ),

      /**
       * evm.current.step.isHalting
       *
       * whether the instruction halts or returns from a calling context
       * HACK: the check for stepsRemainining === 0 is a hack to cover
       * the special case when there are no trace steps; normally this
       * is unnecessary because the spoofed step past the end covers it
       */
      isHalting: createLeaf(
        ["/current/state/depth", "/next/state/depth", trace.stepsRemaining],
        (currentDepth, nextDepth, stepsRemaining) =>
          nextDepth < currentDepth || stepsRemaining === 0
      ),

      /**
       * evm.current.step.isExceptionalHalting
       */
      isExceptionalHalting: createLeaf(
        ["./isHalting", "./returnStatus"],
        (isHalting, status) => isHalting && !status
      ),

      /**
       * evm.current.step.returnStatus
       * checks the return status of the *current* halting instruction or insta-call
       * returns null if not halting & not an insta-call
       * (returns a boolean -- true for success, false for failure)
       */
      returnStatus: createLeaf(
        [
          "./isHalting",
          "./isInstantCallOrCreate",
          "/next/state",
          trace.stepsRemaining,
          "/transaction/status"
        ],
        (isHalting, isInstaCall, { stack }, remaining, finalStatus) => {
          if (!isHalting && !isInstaCall) {
            return null; //not clear this'll do much good since this may get
            //read as false, but, oh well, may as well
          }
          if (remaining <= 1) {
            return finalStatus;
          } else {
            return stack[stack.length - 1] !== ZERO_WORD;
          }
        }
      ),

      /**
       * evm.current.step.returnValue
       *
       * for a [successful] RETURN or REVERT instruction, the value returned;
       * we DO prepend "0x"
       * for everything else, including unsuccessful RETURN, just returns "0x"
       * (which is what the return value would be if the instruction were to
       * fail) (or succeed in the case of STOP or SELFDESTRUCT)
       * NOTE: technically this will be wrong if a REVERT fails, but that case
       * is hard to detect and it barely matters
       */
      returnValue: createLeaf(
        ["./trace", "./isExceptionalHalting", "../state"],

        (step, isExceptionalHalting, { stack, memory }) => {
          if (step.op !== "RETURN" && step.op !== "REVERT") {
            return "0x";
          }
          if (isExceptionalHalting && step.op !== "REVERT") {
            return "0x";
          }
          // Get the data from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 1], 16) * 2;
          const length = parseInt(stack[stack.length - 2], 16) * 2;

          return (
            "0x" +
            memory
              .join("")
              .substring(offset, offset + length)
              .padEnd(length, "00")
          );
        }
      ),

      /**
       * evm.current.step.valueLoaded
       * the storage loaded on an SLOAD. determined by examining
       * the next stack, rather than storage (we're avoiding
       * relying on storage to support old versions of Geth and Besu)
       * we do not include an initial "0x"
       */
      valueLoaded: createLeaf(
        ["./isLoad", "/next/state"],
        (isLoad, { stack }) => {
          if (!isLoad) {
            return null;
          }
          return stack[stack.length - 1];
        }
      ),

      /**
       * evm.current.step.beneficiary
       * NOTE: for a value-destroying selfdestruct, returns null
       */
      beneficiary: createLeaf(
        ["./isSelfDestruct", "../state", "../call"],

        (isSelfDestruct, { stack }, { storageAddress: currentAddress }) => {
          if (!isSelfDestruct) {
            return null;
          }
          const beneficiary = Codec.Evm.Utils.toAddress(
            stack[stack.length - 1]
          );
          return beneficiary !== currentAddress ? beneficiary : null;
        }
      )
    },

    /**
     * evm.current.codex (namespace)
     */
    codex: {
      /**
       * evm.current.codex (selector)
       * the whole codex! not that that's very much at the moment
       */
      _: createLeaf(["/state"], state => state.proc.codex),

      /**
       * evm.current.codex.storage
       * the current storage, as fetched from the codex... unless we're in a
       * failed creation call, then we just fall back on the state (which will
       * work, since nothing else can interfere with the storage of a failed
       * creation call!)
       */
      storage: createLeaf(
        ["./_", "../state/storage", "../call"],
        (codex, rawStorage, { storageAddress }) =>
          storageAddress === Codec.Evm.Utils.ZERO_ADDRESS
            ? rawStorage //HACK -- if zero address ignore the codex
            : codex[codex.length - 1].accounts[storageAddress].storage
      ),

      /*
       * evm.current.codex.instances
       */
      instances: createLeaf(["./_"], codex =>
        Object.assign(
          {},
          ...Object.entries(codex[codex.length - 1].accounts).map(
            ([address, { code, context }]) => ({
              [address]: { address, binary: code, context }
            })
          )
        )
      )
    }
  },

  /**
   * evm.next
   */
  next: {
    /**
     * evm.next.state
     *
     * evm state as a result of next step operation
     */
    state: Object.assign(
      {},
      ...["depth", "error", "gas", "memory", "stack", "storage"].map(param => ({
        [param]: createLeaf([trace.next], step => step[param])
      }))
    ),

    /*
     * evm.next.step
     */
    step: createStepSelectors(trace.next, "./state")
  },

  /**
   * evm.nextOfSameDepth
   */
  nextOfSameDepth: {
    /**
     * evm.nextOfSameDepth.state
     *
     * evm state at the next step of same depth
     * individual parts of the state will return null if there
     * is no such step
     */
    state: Object.assign(
      {},
      ...["depth", "error", "gas", "memory", "stack", "storage"].map(param => ({
        [param]: createLeaf([trace.nextOfSameDepth], step =>
          step ? step[param] : null
        )
      }))
    )
  }
});

export default evm;
