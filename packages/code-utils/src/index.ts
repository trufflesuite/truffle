import parseOpcode from "./opcodes";
import type { Instruction, OpcodeTable, opcodeObject, opcodes } from "./types";
export type { Instruction, OpcodeTable, opcodeObject, opcodes };
import * as cbor from "cbor";

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
export function parseCode(
  hexString: string,
  numInstructions: number = null
): Instruction[] {
  // Convert to an array of bytes
  let code = new Uint8Array(
    (hexString.slice(2).match(/(..?)/g) || []).map(hex => parseInt(hex, 16))
  );

  const stripMetadata = numInstructions === null;

  if (stripMetadata && code.length >= 2) {
    // Remove the contract metadata; last two bytes encode its length (not
    // including those two bytes)
    const metadataLength = (code[code.length - 2] << 8) + code[code.length - 1];
    //check: is this actually valid CBOR?
    if (metadataLength + 2 <= code.length) {
      const metadata = code.subarray(-(metadataLength + 2), -2);
      if (isValidCBOR(metadata)) {
        code = code.subarray(0, -(metadataLength + 2));
      }
    }
  }

  let instructions = [];
  for (
    let pc = 0;
    pc < code.length &&
    (stripMetadata || instructions.length < numInstructions);
    pc++
  ) {
    let opcode: Instruction = {
      pc,
      name: parseOpcode(code[pc])
    };
    if (opcode.name.slice(0, 4) === "PUSH") {
      const length = code[pc] - 0x60 + 1; //0x60 is code for PUSH1
      let pushData = code.subarray(pc + 1, pc + length + 1);
      if (pushData.length < length) {
        //if we run out of bytes for our pushdata, fill the rest
        //with zeroes
        pushData = Uint8Array.from([
          ...pushData,
          ...new Uint8Array(length - pushData.length)
        ]);
      }

      // convert pushData to hex
      opcode.pushData = `0x${Buffer.from(pushData).toString("hex")}`;

      pc += length;
    }
    instructions.push(opcode);
  }
  return instructions;
}

export default {
  //for compatibility
  parseCode
};

function isValidCBOR(metadata: Uint8Array) {
  try {
    //attempt to decode but discard the value
    //note this *will* throw if there's data left over,
    //which is what we want it to do
    cbor.decodeFirstSync(metadata);
  } catch {
    return false;
  }
  return true;
}
