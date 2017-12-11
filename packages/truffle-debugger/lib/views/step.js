export default class StepView {
  /**
   * callAddress - get the address off the stack for a given trace step
   * @return {String}      Address of contract pointed to by this call
   */
  callAddress(step) {
    let address = step.stack[step.stack.length - 2];

    // Remove leading zeroes from address and add "0x" prefix.
    address = "0x" + address.substring(24);

    return address;
  }

  createBinary(step) {
    const memory = step.memory.join("");

    // Get the code that's going to be created from memory.
    // Note we multiply by 2 because these offsets are in bytes.
    const inputOffset = parseInt(step.stack[step.stack.length - 2], 16) * 2;
    const inputSize = parseInt(step.stack[step.stack.length - 3], 16) * 2;

    return "0x" + memory.substring(inputOffset, inputOffset + inputSize);
  }
}
