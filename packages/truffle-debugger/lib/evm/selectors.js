import { createSelectorTree, createLeaf } from "../selectors";

import trace from "../trace/selectors";


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
    )
  },

  /**
   * evm.next
   */
  next: {

    /**
     * evm.next.step
     */
    step: {
      /**
       * evm.next.step.programCounter
       */
      programCounter: createLeaf(
        [trace.step], (step) => step.pc
      ),

      /**
       * evm.next.step.isJump
       */
      isJump: createLeaf(
        [trace.step], (step) => (
          step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
        )
      ),

      /**
       * evm.next.step.isCall
       *
       * whether the next opcode will switch to another calling context
       */
      isCall: createLeaf(
        [trace.step], (step) => step.op == "CALL" || step.op == "DELEGATECALL"
      ),

      /**
       * evm.next.step.isCreate
       */
      isCreate: createLeaf(
        [trace.step], (step) => step.op == "CREATE"
      ),

      /**
       * evm.next.step.isHalting
       *
       * whether the next instruction halts or returns from a calling context
       */
      isHalting: createLeaf(
        [trace.step], (step) => step.op == "STOP" || step.op == "RETURN"
      ),

      /**
       * evm.next.step.callAddress
       *
       * address transferred to by call operation
       */
      callAddress: createLeaf(
        ["./isCall", trace.step], (matches, step) => {
          if (!matches) return null;

          let address = step.stack[step.stack.length - 2]
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
        ["./isCreate", trace.step], (matches, step) => {
          if (!matches) return null;

          const memory = step.memory.join("");

          // Get the code that's going to be created from memory.
          // Note we multiply by 2 because these offsets are in bytes.
          const inputOffset = parseInt(step.stack[step.stack.length - 2], 16) * 2;
          const inputSize = parseInt(step.stack[step.stack.length - 3], 16) * 2;

          return "0x" + memory.substring(inputOffset, inputOffset + inputSize);
        }
      ),
    }
  }
});

export default evm;
