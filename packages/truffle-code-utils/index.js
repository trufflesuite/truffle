var opcodes = require("./opcodes");

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
   * @param  {String} hex_string Hex string representing the code
   * @return Array               Array of instructions
   */
  parseCode: function(hex_string, numInstructions = null) {
    // Convert to an array of bytes (denoted by substrings)
    var code = hex_string.match(/(..?)/g);

    let stripMetadata = numInstructions === null;

    if (stripMetadata) {
      // Remove the contract metadata; last two bytes encode its length (not
      // including those two bytes)
      let metadataLength = parseInt(
        code[code.length - 2] + code[code.length - 1],
        16
      );
      code.splice(-(metadataLength + 2));
    }

    // Convert to Buffer
    code = Buffer.from(code.join("").replace("0x", ""), "hex");

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
        var length = code[pc] - 0x60 + 1; //0x60 is code for PUSH1
        opcode.pushData = code.slice(pc + 1, pc + length + 1);

        // convert pushData to hex
        opcode.pushData = "0x" + opcode.pushData.toString("hex");

        pc += length;
      }
      instructions.push(opcode);
    }
    return instructions;
  }
};
