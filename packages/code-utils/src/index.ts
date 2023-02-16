import { parseOpcode, OpcodeTable } from "./opcodes";
export type { OpcodeTable };
import type { Instruction, DisassemblyOptions } from "./types";
export type { Instruction, DisassemblyOptions };
import * as cbor from "cbor";

/**
 * parseCode - return a list of instructions given a 0x-prefixed code string.
 *
 * The optional second options argument allows two options; both are ways of
 * attempting to limit the disassembly to only the code section rather than the
 * data section.  If maxInstructionCount is used, the disassembly will be limited
 * to the specified number of instructions (one may pass in here the number of
 * instructions in the corresponding source map).
 *
 * If attemptStripMetadata is used, we will attempt to strip the metadata at the
 * end of the code.  This is not reliable, and should be avoided if better
 * alternatives are available.  It may be particularly unreliable when dealing with
 * constructors that have had arguments attached to the end!
 *
 * These options can be combined, although I'm not sure why you'd want to.
 *
 * @param  {String} hexString Hex string representing the code
 * @return Array               Array of instructions
 */
export function parseCode(
  hexString: string,
  { maxInstructionCount, attemptStripMetadata }: DisassemblyOptions = {}
): Instruction[] {
  // Convert to an array of bytes
  let code = new Uint8Array(
    (hexString.slice(2).match(/(..?)/g) || []).map(hex => parseInt(hex, 16))
  );

  if (attemptStripMetadata && code.length >= 2) {
    // Remove the contract metadata; last two bytes encode its length (not
    // including those two bytes)
    let foundMetadata = false;
    const metadataLength = (code[code.length - 2] << 8) + code[code.length - 1];
    //check: is this actually valid CBOR?
    if (metadataLength + 2 <= code.length) {
      const metadata = code.subarray(-(metadataLength + 2), -2);
      if (isValidCBOR(metadata)) {
        code = code.subarray(0, -(metadataLength + 2));
        foundMetadata = true;
      }
    }
    if (!foundMetadata) {
      const vyper034MetadataLength = 11; //vyper 0.3.4 (that version specifically;
      //this will be corrected in 0.3.5, and earlier vyper versions do not include
      //metadata) has metadata on the end but with no length information supplied
      //afterward; instead it has a fixed length of 11
      if (vyper034MetadataLength <= code.length) {
        const metadata = code.subarray(-vyper034MetadataLength);
        if (isValidCBOR(metadata)) {
          code = code.subarray(0, -vyper034MetadataLength);
        }
      }
    }
  }

  let instructions = [];
  if (maxInstructionCount === undefined) {
    //if maxInstructionCount wasn't passed, we'll set it to
    //Infinity so that we don't limit the number of instructions
    maxInstructionCount = Infinity;
  }
  for (
    let pc = 0;
    pc < code.length && instructions.length < maxInstructionCount;
    pc++
  ) {
    let opcode: Instruction = {
      pc,
      name: parseOpcode(code[pc])
    };
    if (opcode.name.slice(0, 4) === "PUSH") {
      const length = code[pc] - 0x5f; //0x5f is code for PUSH0
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

function isValidCBOR(metadata: Uint8Array) {
  try {
    //attempt to decode but discard the value
    //note this *will* throw if there's data left over,
    //which is what we want it to do
    //HACK: this version of cbor doesn't accept Uint8Arrays,
    //but it does accept Buffers.  (Unfortunately newer versions
    //cause problems. :-/ )
    cbor.decodeFirstSync(Buffer.from(metadata));
  } catch {
    return false;
  }
  return true;
}
