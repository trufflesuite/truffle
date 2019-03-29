var opcodes = require("./opcodes");

module.exports = {
  /**
   * parseCode - return a list of instructions given a 0x-prefixed code string.
   *
   * Any contract metadata, if present, will be stripped.
   *
   * @param  {String} hex_string Hex string representing the code
   * @return Array               Array of instructions
   */
  parseCode: function(hex_string) {
    // Convert to an array of bytes (denoted by substrings)
    var code = hex_string.match(/(..?)/g);

    // Remove the contract metadata; last two bytes encode its length (not
    // including those two bytes)
    // TODO: Make this conditional, as it's assumed the metadata exists.
    let metadataLength = parseInt(
      code[code.length - 2] + code[code.length - 1],
      16
    );
    code.splice(-(metadataLength + 2));

    // Convert to Buffer
    code = Buffer.from(code.join("").replace("0x", ""), "hex");

    var instructions = [];
    for (var pc = 0; pc < code.length; pc++) {
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
