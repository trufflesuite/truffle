import { createSelectorTree, createLeaf } from "lib/selectors";

import trace from "lib/trace/selectors";


const evm = createSelectorTree({

  /**
   * evm.current
   */
  current: {

    /**
     * evm.current.callstack
     */
    callstack: (state) => state.evm.callstack,

    /**
     * evm.current.call
     */
    call: createLeaf(
      ["./callstack"],

      (stack) => stack.length ? stack[stack.length - 1] : {}
    ),

    /**
     * evm.current.state
     *
     * evm state info: as of last operation, before op defined in step
     */
    state: createLeaf(
      [trace.step], ({depth, error, gas, memory, stack, storage}) =>
        ({depth, error, gas, memory, stack, storage})
    ),

    /**
     * evm.current.stack
     *
     * stack data
     */
    stack: createLeaf(
      [trace.step], (step) => step.stack
    ),

    /**
     * evm.current.memory
     *
     * memory data
     */
    memory: createLeaf(
      [trace.step], (step) => step.memory
    ),

    /**
     * evm.current.storage,
     *
     * storage data
     */
    storage: createLeaf(
      [trace.step], (step) => step.storage
    )
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
    step: {
      /**
       * evm.next.step.trace
       *
       * trace step info related to next evm operation
       */
      trace: createLeaf(
        [trace.step], ({gasCost, op, pc}) => ({gasCost, op, pc})
      ),

      /**
       * evm.next.step.programCounter
       */
      programCounter: createLeaf(
        ["./trace"], (step) => step.pc
      ),

      /**
       * evm.next.step.isJump
       */
      isJump: createLeaf(
        ["./trace"], (step) => (
          step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
        )
      ),

      /**
       * evm.next.step.isCall
       *
       * whether the next opcode will switch to another calling context
       */
      isCall: createLeaf(
        ["./trace"], (step) => step.op == "CALL" || step.op == "DELEGATECALL"
      ),

      /**
       * evm.next.step.isCreate
       */
      isCreate: createLeaf(
        ["./trace"], (step) => step.op == "CREATE"
      ),

      /**
       * evm.next.step.isHalting
       *
       * whether the next instruction halts or returns from a calling context
       */
      isHalting: createLeaf(
        ["./trace"], (step) => step.op == "STOP" || step.op == "RETURN"
      ),

      /**
       * evm.next.step.callAddress
       *
       * address transferred to by call operation
       */
      callAddress: createLeaf(
        ["./isCall", "./trace", "/current/state"],

        (matches, step, {stack}) => {
          if (!matches) return null;

          let address = stack[stack.length - 2]
          address = "0x" + address.substring(24);
          return address;
        }
      ),

      /**
       * evm.next.step.createBinary
       *
       * binary code to execute via create operation
       */
      createBinary: createLeaf(
        ["./isCreate", "./trace", "/current/state"],

        (matches, step, {stack, memory}) => {
          if (!matches) return null;

          // Get the code that's going to be created from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const offset = parseInt(stack[stack.length - 2], 16) * 2;
          const length = parseInt(stack[stack.length - 3], 16) * 2;

          return "0x" + memory.join("").substring(offset, offset + length);
        }
      ),
    }
  }
});

export default evm;
