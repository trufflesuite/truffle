import BigNumber from "bignumber.js";
import { BigNumber as EthersBigNumber } from "@ethersproject/bignumber";

// Unfortunately, both BigNumber and EthersBigNumber's isBigNumber methods
// **both return false positives on the other BigNumber class**.
// (This is because they both just check for the _isBigNumber flag.)
// As such, we've made our own method to recognize these, by
// A. using the appropriate method, but then also
// B. checking for the presence of a method that one class has but the other
// doesn't.

export function isBigNumber(input: any): input is BigNumber {
  return BigNumber.isBigNumber(input) && Boolean(input.toFixed);
}

export function isEthersBigNumber(input: any): input is EthersBigNumber {
  return EthersBigNumber.isBigNumber(input) && Boolean(input.toHexString);
}
