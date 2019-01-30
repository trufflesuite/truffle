import BN from "bn.js";
import Web3 from "web3";
import { Conversion as ConversionUtils } from "./conversion";

export namespace EVM {
  export const WORD_SIZE = 0x20;
  export const BYTE_BITS = 8;
  export const MAX_WORD = new BN(-1).twoTwos(WORD_SIZE * BYTE_BITS);

  export function keccak256(...args: any[]): BN {

    // debug("args %o", args);

    const sha: string = Web3.utils.soliditySha3(...args).replace(/0x/, "");
    // debug("sha %o", sha);
    return ConversionUtils.toBN(sha);
  }
}
