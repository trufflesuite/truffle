import debugModule from "debug";
const debug = debugModule("decode-utils:evm");

import BN from "bn.js";
import Web3 from "web3";
import { Conversion as ConversionUtils } from "./conversion";
import { Constants } from "./constants";

export namespace EVM {
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
}
