import debugModule from "debug";
const debug = debugModule("debugger:evm:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";

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
     * trace step info related to next evm operation
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
     * whether the next opcode will switch to another calling context
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
     * whether the next instruction halts or returns from a calling context
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
    binaries: createLeaf(['/state'], (state) => state.info.contexts.byBinary)
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
      ["./call", "/info/instances", "/info/binaries", "/info/contexts"],

      ({address, binary}, instances, binaries, contexts) => {
        var record;
        if (address) {
          record = instances[address];
        } else {
          // trim off possible constructor args, one word at a time
          // HACK until there's better CREATE semantics
          while (record === undefined && binary) {
            record = binaries[binary];
            binary = binary.slice(0, -(WORD_SIZE * 2));
          }
        }

        return contexts[(record || {}).context];
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
    ))
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

    /**
     * evm.next.step
     */
    step: createStepSelectors(trace.step, "/current/state")
  }
});

export default evm;
