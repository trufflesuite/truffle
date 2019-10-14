import debugModule from "debug";
const debug = debugModule("codec:utils:evm");

import BN from "bn.js";
import Web3 from "web3";
import * as ConversionUtils from "./conversion";
import * as Constants from "./constants";

//the following constants are re-exported from EVM for convenience
export const WORD_SIZE = Constants.WORD_SIZE;
export const ADDRESS_SIZE = Constants.ADDRESS_SIZE;
export const SELECTOR_SIZE = Constants.SELECTOR_SIZE;
export const PC_SIZE = Constants.PC_SIZE;
export const MAX_WORD = Constants.MAX_WORD;
export const ZERO_ADDRESS = Constants.ZERO_ADDRESS;

//beware of using this for generic strings! (it's fine for bytestrings, or
//strings representing numbers) if you want to use this on a generic string,
//you should pass in {type: "string", value: theString} instead of the string
//itself.
//(maybe I should add a rawKeccak256 function, using sha3 instead of
//soliditysha3?  not seeing the need atm though)
export function keccak256(...args: any[]): BN {

  // debug("args %o", args);

  const rawSha: string | null = Web3.utils.soliditySha3(...args);
  debug("rawSha %o", rawSha);
  let sha: string;
  if(rawSha === null) {
    sha = ""; //HACK, I guess?
  }
  else {
    sha = rawSha.replace(/0x/, "");
  }
  return ConversionUtils.toBN(sha);
}

//checks if two bytearrays (which may be undefined) are equal.
//does not consider undefined to be equal to itself.
export function equalData(bytes1: Uint8Array | undefined, bytes2: Uint8Array | undefined): boolean {
  if(!bytes1 || !bytes2) {
    return false;
  }
  if(bytes1.length !== bytes2.length) {
    return false;
  }
  for(let i = 0; i < bytes1.length; i++) {
    if(bytes1[i] !== bytes2[i]) {
      return false;
    }
  }
  return true;
}

export function toAddress(bytes: Uint8Array | string): string {

  if(typeof bytes === "string") {
    //in this case, we can do some simple string manipulation and
    //then pass to web3
    let hex = bytes; //just renaming for clarity
    if (hex.startsWith("0x")) {
      hex = hex.slice(2);
    }
    if(hex.length < 2 * Constants.ADDRESS_SIZE)
    {
      hex = hex.padStart(2 * Constants.ADDRESS_SIZE, "0");
    }
    if(hex.length > 2 * Constants.ADDRESS_SIZE)
    {
      hex = "0x" + hex.slice(hex.length - 2 * Constants.ADDRESS_SIZE);
    }
    return Web3.utils.toChecksumAddress(hex);
  }
  //otherwise, we're in the Uint8Array case, which we can't fully handle ourself

  //truncate *on left* to 20 bytes
  if(bytes.length > Constants.ADDRESS_SIZE) {
    bytes = bytes.slice(bytes.length - Constants.ADDRESS_SIZE, bytes.length);
  }

  //now, convert to hex string and apply checksum case that second argument
  //(which ensures it's padded to 20 bytes) shouldn't actually ever be
  //needed, but I'll be safe and include it
  return Web3.utils.toChecksumAddress(ConversionUtils.toHexString(bytes, Constants.ADDRESS_SIZE));
}
