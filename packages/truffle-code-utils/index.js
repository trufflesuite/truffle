const opcodes = require("./opcodes");

module.exports = {
  /**
   * parseCode - return a list of instructions given a 0x-prefixed code string.
   *
   * If numInstructions is not passed in, we attempt to strip contract
   * metadata.  This won't work very well if the code is for a constructor or a
   * contract that can create other contracts, but it's better than nothing.
   *
   * WARNING: Don't invoke the function that way if you're dealing with a
   * constructor with arguments attached!  Then you could get disaster!
   *
   * If you pass in numInstructions (hint: count the semicolons in the source
   * map, then add one) this is used to exclude metadata instead.
   *
   * @param  {String} hexString Hex string representing the code
   * @return Array               Array of instructions
   */
  parseCode(hexString, numInstructions = null) {
    // Convert to an array of bytes
    let code = (hexString.slice(2).match(/(..?)/g) || []).map(hex =>
      parseInt(hex, 16)
    );

    let stripMetadata = numInstructions === null;

    if (stripMetadata) {
      // Remove the contract metadata; last two bytes encode its length (not
      // including those two bytes)
      let metadataLength = (code[code.length - 2] << 8) + code[code.length - 1];
      code.splice(-(metadataLength + 2));
    }

    let instructions = [];
    for (
      let pc = 0;
      pc < code.length &&
      (stripMetadata || instructions.length < numInstructions);
      pc++
    ) {
      let opcode = {};
      opcode.pc = pc;
      opcode.name = opcodes(code[pc]);
      if (opcode.name.slice(0, 4) === "PUSH") {
        const length = code[pc] - 0x60 + 1; //0x60 is code for PUSH1
        opcode.pushData = code.slice(pc + 1, pc + length + 1);
        if (opcode.pushData.length < length) {
          opcode.pushData = opcode.pushData.concat(
            new Array(length - opcode.pushData.length).fill(0)
          );
        }

        // convert pushData to hex
        opcode.pushData = `0x${Buffer.from(opcode.pushData).toString("hex")}`;

        pc += length;
      }
      instructions.push(opcode);
    }
    return instructions;
  }
};
