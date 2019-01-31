import BN from "bn.js";
import Web3 from "web3";
import { Conversion as ConversionUtils } from "./conversion";

export namespace EVM {
  export const WORD_SIZE = ConversionUtils.WORD_SIZE; //0x20
  export const ADDRESS_SIZE = ConversionUtils.ADDRESS_SIZE; //20
  export const SELECTOR_SIZE = 4;
  export const MAX_WORD = new BN(-1).toTwos(WORD_SIZE * 8);

  export function keccak256(...args: any[]): BN {

    // debug("args %o", args);

    const sha: string = Web3.utils.soliditySha3(...args).replace(/0x/, "");
    // debug("sha %o", sha);
    return ConversionUtils.toBN(sha);
  }
}
