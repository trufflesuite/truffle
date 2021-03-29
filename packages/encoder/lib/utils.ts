import BigNumber from "bignumber.js";
import { BigNumber as EthersBigNumber } from "@ethersproject/bignumber";
import escapeRegExp from "lodash.escaperegexp";

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

interface Links {
  [libraryName: string]: string;
}

//warning: copied (OK, adapted) from Truffle Contract!
export function link(bytecode: string, links: Links): string {
  if (!bytecode) {
    return bytecode;
  }
  const names = Object.keys(links).sort((a, b) => b.length - a.length); //sort from longest to shortest
  //(this allows overlong names to be handled properly)
  for (const name of names) {
    const address = links[name];
    bytecode = bytecode.replace(
      //we have to escape as names may include '$'
      new RegExp(`__${escapeRegExp(name)}_*`, "g"),
      //note: we don't have to worry about link references running into
      //one another, because each one is always preceded by a PUSH20 (0x73)
      address.slice(2) //cut off initial 0x
    );
  }
  return bytecode;
}
