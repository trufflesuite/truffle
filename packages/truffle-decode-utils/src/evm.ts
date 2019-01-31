import BN from "bn.js";
import Web3 from "web3";
import { Conversion as ConversionUtils } from "./conversion";

export namespace EVM {
  export const WORD_SIZE = 0x20;
  export const ADDRESS_SIZE = 20;
  export const SELECTOR_SIZE = 4;
  export const MAX_WORD = new BN(-1).toTwos(WORD_SIZE * 8);

  //beware of using this for generic strings! (it's fine for bytestrings, or
  //strings representing numbers) if you want to use this on a generic string,
  //you should pass in {type: "string", value: theString} instead of the string
  //itself.
  //(maybe I should add a rawKeccak256 function, using sha3 instead of
  //soliditysha3?  not seeing the need atm though)
  export function keccak256(...args: any[]): BN {

    // debug("args %o", args);

    const rawSha: string | null = Web3.utils.soliditySha3(...args);
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
