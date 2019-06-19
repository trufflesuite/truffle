import BN from "bn.js";
import Web3 from "web3";
import { Constants } from "./constants";
import { Values } from "./types/values";

export namespace Conversion {

  /**
   * @param bytes - undefined | string | number | BN | Uint8Array
   * @return {BN}
   */
  export function toBN(bytes: undefined | string | number | BN | Uint8Array): BN {
    if (bytes === undefined) {
      return undefined;
    } else if (typeof bytes == "string") {
      return new BN(bytes, 16);
    } else if (typeof bytes == "number" || BN.isBN(bytes)) {
      return new BN(bytes);
    } else if (bytes.reduce) {
      return bytes.reduce(
        (num: BN, byte: number) => num.shln(8).addn(byte),
        new BN(0)
      );
    }
  }

  /**
   * @param bytes - Uint8Array
   * @return {BN}
   */
  export function toSignedBN(bytes: Uint8Array): BN {
    if (bytes[0] < 0x80) {  // if first bit is 0
      return toBN(bytes);
    } else {
      return toBN(bytes.map( (b) => 0xff - b )).addn(1).neg();
    }
  }

  /**
   * @param bytes - Uint8Array | BN
   * @param padLength - number - minimum desired byte length (left-pad with zeroes)
   * @return {string}
   */
  export function toHexString(bytes: Uint8Array | BN, padLength: number = 0): string {

    if (BN.isBN(bytes)) {
      bytes = toBytes(bytes);
    }

    const pad = (s: string) => `${"00".slice(0, 2 - s.length)}${s}`;

    //                                          0  1  2  3  4
    //                                 0  1  2  3  4  5  6  7
    // bytes.length:        5  -  0x(          e5 c2 aa 09 11 )
    // length (preferred):  8  -  0x( 00 00 00 e5 c2 aa 09 11 )
    //                                `--.---'
    //                                     offset 3
    if (bytes.length < padLength) {
      let prior = bytes;
      bytes = new Uint8Array(padLength);

      bytes.set(prior, padLength - prior.length);
    }

    // debug("bytes: %o", bytes);

    let string = bytes.reduce(
      (str, byte) => `${str}${pad(byte.toString(16))}`, ""
    );

    return `0x${string}`;
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
    return Web3.utils.toChecksumAddress(toHexString(bytes, Constants.ADDRESS_SIZE));
  }

  export function toBytes(data: BN | string | number, length: number = 0): Uint8Array {
    //note that length is a minimum output length
    //strings will be 0-padded on left
    //numbers/BNs will be sign-padded on left
    //NOTE: if a number/BN is passed in that is too big for the given length,
    //you will get an error!
    //(note that strings passed in should be hex strings; this is not for converting
    //generic strings to hex)

    if (typeof data === "string") {

      let hex = data; //renaming for clarity

      if (hex.startsWith("0x")) {
        hex = hex.slice(2);
      }

      if(hex === "") {
        //this special case is necessary because the match below will return null,
        //not an empty array, when given an empty string
        return new Uint8Array(0);
      }

      if (hex.length % 2 == 1) {
        hex = `0${hex}`;
      }

      let bytes = new Uint8Array(
        hex.match(/.{2}/g)
          .map( (byte) => parseInt(byte, 16) )
      );

      if (bytes.length < length) {
        let prior = bytes;
        bytes = new Uint8Array(length);
        bytes.set(prior, length - prior.length);
      }

      return bytes;
    }
    else {
      // BN/number case
      if(typeof data === "number") {
        data = new BN(data);
      }

      //note that the argument for toTwos is given in bits
      return new Uint8Array(data.toTwos(length * 8).toArrayLike(Buffer, "be", length)); //big-endian
    }
  }

  //for convenience: invokes the nativize method on all the given variables
  export function nativizeVariables(variables: {[name: string]: Values.Result}): {[name: string]: any} {
    return Object.assign({}, ...Object.entries(variables).map(
      ([name, value]) => ({[name]: value.nativize()})
    ));
  }
}
