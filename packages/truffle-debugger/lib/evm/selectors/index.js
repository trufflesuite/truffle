import debugModule from "debug";
const debug = debugModule("debugger:evm:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import levenshtein from "fast-levenshtein";

import trace from "lib/trace/selectors";

const WORD_SIZE = 0x20;

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
    trace: createLeaf(
      [step], ({gasCost, op, pc}) => ({gasCost, op, pc})
    ),

    /**
     * .programCounter
     */
    programCounter: createLeaf(
      ["./trace"], (step) => step.pc
    ),

    /**
     * .isJump
     */
    isJump: createLeaf(
      ["./trace"], (step) => (
        step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
      )
    ),

    /**
     * .isCall
     *
     * whether the opcode will switch to another calling context
     */
    isCall: createLeaf(
      ["./trace"], (step) => step.op == "CALL" || step.op == "DELEGATECALL"
    ),

    /**
     * .isCreate
     */
    isCreate: createLeaf(
      ["./trace"], (step) => step.op == "CREATE"
    ),

    /**
     * .isHalting
     *
     * whether the instruction halts or returns from a calling context
     */
    isHalting: createLeaf(
      ["./trace"], (step) => step.op == "STOP" || step.op == "RETURN"
    )
  };

  if (state) {
    const isRelative = (path) => (
      typeof path == "string" && (
        path.startsWith("./") || path.startsWith("../")
      )
    );

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

        (matches, step, {stack}) => {
          if (!matches) return null;

          let address = stack[stack.length - 2]
          address = "0x" + address.substring(24);
          return address;
        }
      ),

      /**
       * .createBinary
       *
       * binary code to execute via create operation
       */
      createBinary: createLeaf(
        ["./isCreate", "./trace", state],

        (matches, step, {stack, memory}) => {
          if (!matches) return null;

          // Get the code that's going to be created from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 2], 16) * 2;
          const length = parseInt(stack[stack.length - 3], 16) * 2;

          return "0x" + memory.join("").substring(offset, offset + length);
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
  state: (state) => state.evm,

  /**
   * evm.info
   */
  info: {
    /**
     * evm.info.contexts
     */
    contexts: createLeaf(['/state'], (state) => state.info.contexts.byContext),

    /**
     * evm.info.instances
     */
    instances: createLeaf(['/state'], (state) => state.info.instances.byAddress),

    /**
     * evm.info.binaries
     */
    binaries: {
      _: createLeaf(['/state'], (state) => state.info.contexts.byBinary),

      /**
       * evm.info.binaries.search
       *
       * returns function (binary) => context
       */
      search: createLeaf(['./_'], (binaries) =>
        (binary) => {
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
            .map( ([ knownBinary, { context }]) => ({
              context,
              distance: levenshtein.get(knownBinary, binary)
            }))
            .filter( ({ distance }) => distance <= binary.length * threshold )
            .sort( ({distance: a}, {distance: b}) => a - b );

          if (results[0]) {
            const { context } = results[0];
            return { context };
          }

          return {};
        }
      )
    }
  },

  /**
   * evm.current
   */
  current: {

    /**
     * evm.current.callstack
     */
    callstack: (state) => state.evm.proc.callstack,

    /**
     * evm.current.call
     */
    call: createLeaf(
      ["./callstack"],

      (stack) => stack.length ? stack[stack.length - 1] : {}
    ),

    /**
     * evm.current.context
     */
    context: createLeaf(
      ["./call", "/info/instances", "/info/binaries/search", "/info/contexts"],

      ({address, binary}, instances, search, contexts) => {
        let record;
        if (address) {
          record = instances[address];
          if (!record) {
            return { address };
          }
          binary = record.binary
        } else {
          record = search(binary);
        }

        let context = contexts[(record || {}).context];

        return {
          ...context,
          binary
        }
      }
    ),

    /**
     * evm.current.state
     *
     * evm state info: as of last operation, before op defined in step
     */
    state: Object.assign({}, ...(
      [
        "depth",
        "error",
        "gas",
        "memory",
        "stack",
        "storage"
      ].map( (param) => ({
        [param]: createLeaf([trace.step], (step) => step[param])
      }))
    )),

    /**
     * evm.current.step
     */
    step: createStepSelectors(trace.step, "./state")
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
    state: Object.assign({}, ...(
      [
        "depth",
        "error",
        "gas",
        "memory",
        "stack",
        "storage"
      ].map( (param) => ({
        [param]: createLeaf([trace.next], (step) => step[param])
      }))
    )),

    step: createStepSelectors(trace.next, "./state")
  }
});

export default evm;
