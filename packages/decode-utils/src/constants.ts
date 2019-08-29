import BN from "bn.js";

export namespace Constants {
  export const WORD_SIZE = 0x20;
  export const ADDRESS_SIZE = 20;
  export const SELECTOR_SIZE = 4;
  export const PC_SIZE = 4;
  export const MAX_WORD = new BN(-1).toTwos(WORD_SIZE * 8);
  export const ZERO_ADDRESS = "0x" + "00".repeat(ADDRESS_SIZE);
}
