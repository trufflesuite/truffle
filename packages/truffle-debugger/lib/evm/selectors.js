import { createSelector } from "reselect";
import { createSelectorTree, createLeaf } from "../selectors";

import trace from "../trace/selectors";

const selector = createSelectorTree({
  current: {
    callstack: (state) => state.evm.callstack,

    call: createLeaf(
      ["./callstack"],

      (stack) => stack.length ? stack[stack.length - 1] : {}
    )
  },

  /**
   * Data views about next step of execution for the EVM
   */
  nextStep: {

    /**
     * evm.nextStep.programCounter
     */
    programCounter: createLeaf(
      [trace.step], (step) => step.pc
    ),

    /**
     * evm.nextStep.isJump
     */
    isJump: createLeaf(
      [trace.step], (step) => (
        step.op != "JUMPDEST" && step.op.indexOf("JUMP") == 0
      )
    ),

    /**
     * evm.nextStep.isCall
     *
     * whether the next opcode will switch to another calling context
     */
    isCall: createLeaf(
      [trace.step], (step) => step.op == "CALL" || step.op == "DELEGATECALL"
    ),

    /**
     * evm.nextStep.isCreate
     */
    isCreate: createLeaf(
      [trace.step], (step) => step.op == "CREATE"
    ),

    /**
     * evm.nextStep.isHalting
     *
     * whether the next instruction halts or returns from a calling context
     */
    isHalting: createLeaf(
      [trace.step], (step) => step.op == "STOP" || step.op == "RETURN"
    ),

    /**
     * evm.nextStep.callAddress
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
     * evm.nextStep.createBinary
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

});
export default selector;
