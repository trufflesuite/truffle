import BN from "bn.js";
import Web3 from "web3";
import { Conversion as ConversionUtils } from "./conversion";
import { Mixed } from "web3/utils";

export namespace EVM {
  export const WORD_SIZE = 0x20;
  export const MAX_WORD = new BN(2).pow(new BN(256)).subn(1);

  /**
   * recursively converts big numbers into something nicer to look at
   */
  // TODO:
  /*export function cleanBNs(value: BN | ) {
    if (BN.isBN(value)) {
      return value.toNumber();

    } else if (value && value.map != undefined) {
      return value.map( (inner) => cleanBigNumbers(inner) );

    } else if (value && typeof value == "object") {
      return Object.assign(
        {}, ...Object.entries(value)
          .map( ([key, inner]) => ({ [key]: cleanBigNumbers(inner) }) )
      );

    } else {
      return value;
    }
  }*/

  export function keccak256(...args: Mixed[]): BN {
    let web3 = new Web3();

    // debug("args %o", args);

    let sha = web3.utils.soliditySha3(...args);
    // debug("sha %o", sha);
    return ConversionUtils.toBN(sha);
  }
}