import debugModule from "debug";
const debug = debugModule("debugger:evm:selectors"); // eslint-disable-line no-unused-vars

import { createSelectorTree, createLeaf } from "reselect-tree";
import levenshtein from "fast-levenshtein";

import trace from "lib/trace/selectors";

import * as DecodeUtils from "truffle-decode-utils";
import {
  isCallMnemonic,
  isCreateMnemonic,
  isShortCallMnemonic,
  isDelegateCallMnemonicBroad
} from "lib/helpers";

function findContext({ address, binary }, instances, search, contexts) {
  let record;
  if (address) {
    record = instances[address];
    if (!record) {
      return { address };
    }
    binary = record.binary;
  } else {
    record = search(binary);
  }

  let context = contexts[(record || {}).context];

  return {
    ...context,
    binary
  };
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
    trace: createLeaf([step], ({ gasCost, op, pc }) => ({ gasCost, op, pc })),

    /**
     * .programCounter
     */
    programCounter: createLeaf(["./trace"], step => step.pc),

    /**
     * .isJump
     */
    isJump: createLeaf(
      ["./trace"],
      step => step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
    ),

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
     * for calls delegate storage
     */
    isDelegateCallBroad: createLeaf(["./trace"], step =>
      isDelegateCallMnemonicBroad(step.op)
    ),

    /**
     * .isCreate
     */
    isCreate: createLeaf(["./trace"], step => isCreateMnemonic(step.op)),

    /**
     * .isHalting
     *
     * whether the instruction halts or returns from a calling context
     */
    isHalting: createLeaf(
      ["./trace"],
      step => step.op == "STOP" || step.op == "RETURN"
    ),

    /**
     * .isContextChange
     * groups together calls, creates, and halts
     */
    isContextChange: createLeaf(
      ["./isCall", "./isCreate", "./isHalting"],
      (call, create, halt) => call || create || halt
    )
  };

  if (state) {
    const isRelative = path =>
      typeof path == "string" &&
      (path.startsWith("./") || path.startsWith("../"));

    if (isRelative(state)) {
      state = `../${state}`;
    }

    Object.assign(base, {
      /**
       * .callAddress
       *
       * address transferred to by call operation
       */
      callAddress: createLeaf(
        ["./isCall", "./trace", state],

        (matches, step, { stack }) => {
          if (!matches) return null;

          let address = stack[stack.length - 2];
          return DecodeUtils.Conversion.toAddress(address);
        }
      ),

      /**
       * .createBinary
       *
       * binary code to execute via create operation
       */
      createBinary: createLeaf(
        ["./isCreate", "./trace", state],

        (matches, step, { stack, memory }) => {
          if (!matches) return null;

          // Get the code that's going to be created from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 2], 16) * 2;
          const length = parseInt(stack[stack.length - 3], 16) * 2;

          return "0x" + memory.join("").substring(offset, offset + length);
        }
      ),

      /**
       * .callData
       *
       * data passed to EVM call
       */
      callData: createLeaf(
        ["./isCall", "./isShortCall", "./trace", state],
        (matches, short, step, { stack, memory }) => {
          if (!matches) return null;

          //if it's 6-argument call, the data start and offset will be one spot
          //higher in the stack than they would be for a 7-argument call, so
          //let's introduce an offset to handle this
          let argOffset = short ? 1 : 0;

          // Get the data from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 4 + argOffset], 16) * 2;
          const length = parseInt(stack[stack.length - 5 + argOffset], 16) * 2;

          return "0x" + memory.join("").substring(offset, offset + length);
        }
      ),

      /**
       * .callContext
       *
       * context for what we're about to call into (or create)
       */
      callContext: createLeaf(
        [
          "./callAddress",
          "./createBinary",
          "/info/instances",
          "/info/binaries/search",
          "/info/contexts"
        ],
        (address, binary, instances, search, contexts) =>
          findContext({ address, binary }, instances, search, contexts)
      ),

      /**
       * .callsPrecompile
       *
       * is the call address to a precompiled contract?
       * HACK
       */
      callsPrecompile: createLeaf(
        ["./callAddress", "/info/contexts", "/info/instances"],

        (address, contexts, instances) => {
          if (!address) return null;

          let { context } = instances[address] || {};
          let { binary } = contexts[context] || {};
          return !binary;
        }
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
     * evm.info.instances
     */
    instances: createLeaf(["/state"], state => state.info.instances.byAddress),

    /**
     * evm.info.binaries
     */
    binaries: {
      _: createLeaf(["/state"], state => state.info.contexts.byBinary),

      /**
       * evm.info.binaries.search
       *
       * returns function (binary) => context
       */
      search: createLeaf(["./_"], binaries => binary => {
        // search for a given binary based on levenshtein distances to
        // existing (known) context binaries.
        //
        // levenshtein distance is the number of textual modifications
        // (insert, change, delete) required to convert string a to b
        //
        // filter by a percentage threshold
        const threshold = 0.25;

        // skip levenshtein check for undefined binaries
        if (!binary || binary == "0x0") {
          return {};
        }

        const results = Object.entries(binaries)
          .map(([knownBinary, { context }]) => ({
            context,
            distance: levenshtein.get(knownBinary, binary)
          }))
          .filter(({ distance }) => distance <= binary.length * threshold)
          .sort(({ distance: a }, { distance: b }) => a - b);

        if (results[0]) {
          const { context } = results[0];
          return { context };
        }

        return {};
      })
    }
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
      ["./call", "/info/instances", "/info/binaries/search", "/info/contexts"],
      findContext
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

      /*
       * evm.current.step.createdAddress
       *
       * address created by the current create step;
       * only exists for current, not next
       */
      createdAddress: createLeaf(
        ["./isCreate", "/nextOfSameDepth/state/stack"],
        (matches, stack) => {
          if (!matches) {
            return undefined;
          }
          let address = stack[stack.length - 1];
          return DecodeUtils.Conversion.toAddress(address);
        }
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
     */
    state: Object.assign(
      {},
      ...["depth", "error", "gas", "memory", "stack", "storage"].map(param => ({
        [param]: createLeaf([trace.nextOfSameDepth], step => step[param])
      }))
    )
  }
});

export default evm;
