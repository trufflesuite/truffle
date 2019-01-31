import BN from "bn.js";
import Web3 from "web3";
import { EVM as EVMUtils } from "./evm";

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
      if(hex.length < 2 * EVMUtils.ADDRESS_SIZE)
      {
        hex = hex.padStart(2 * EVMUtils.ADDRESS_SIZE, "0");
      }
      if(hex.length > 2 * EVMUtils.ADDRESS_SIZE)
      {
        hex = "0x" + hex.slice(hex.length - 2 * EVMUtils.ADDRESS_SIZE);
      }
      return Web3.utils.toChecksumAddress(hex);
    }
    //otherwise, we're in the Uint8Array case, which we can't fully handle ourself

    //truncate *on left* to 20 bytes
    if(bytes.length > EVMUtils.ADDRESS_SIZE) {
      bytes = bytes.slice(bytes.length - EVMUtils.ADDRESS_SIZE, bytes.length);
    }

    //now, convert to hex string and apply checksum case that second argument
    //(which ensures it's padded to 20 bytes) shouldn't actually ever be
    //needed, but I'll be safe and include it
    return Web3.utils.toChecksumAddress(toHexString(bytes, EVMUtils.ADDRESS_SIZE));
  }

  export function toBytes(number: number | BN | string, length: number = 0): Uint8Array {
    let bytes = new Uint8Array(0);

    if (typeof number === "number") {
      if (number < 0) {
        return bytes;
      }

      bytes = new Uint8Array(number);
    } else if (typeof number === "string") {
      if (number === "") {
        return bytes;
      }

      let hex = number;

      if (hex.startsWith("0x")) {
        hex = hex.slice(2);
      }

      if (hex.length % 2 == 1) {
        hex = `0${hex}`;
      }

      bytes = new Uint8Array(
        hex.match(/.{2}/g)
          .map( (byte) => parseInt(byte, 16) )
      );

      if (bytes.length < length) {
        let prior = bytes;
        bytes = new Uint8Array(length);
        bytes.set(prior, length - prior.length);
      }
    } else {
      // BN
      if (number.ltn(0)) {
        return bytes;
      }

      bytes = new Uint8Array(number.toArrayLike(Buffer));
    }

    return bytes;
  }

  /**
   * recursively converts big numbers into something nicer to look at
   */
  export function cleanBNs(value: any): any {
    if (BN.isBN(value)) {
      return value.toString();

    } else if (value && value.map != undefined) {
      return value.map( (inner: any) => cleanBNs(inner) );

    } else if (value && typeof value == "object") {
      return Object.assign(
        {}, ...Object.entries(value)
          .map( ([key, inner]) => ({ [key]: cleanBNs(inner) }) )
      );

    } else {
      return value;
    }
  }

  /**
   * recursively converts decoder-native mapping values to JS Map objects
   * and struct values to JS ordinary objects, respecitvely
   *
   * (eventually it will probably also have to clean arrays, but currently
   * those don't require cleaning)
   *
   * detects int and uint Solidity types and uses BNs as keys in such
   * situations
   *
   * all other keys are just kept as strings right now
   */
  export function cleanContainers(value: any): any {
    // HACK detect mappings as any object with certain *truthy* properties,
    // where `type` has explicit value `"mapping"`
    // FURTHER HACK detect other things wth members as a struct
    // in the latter case we'll also require that each of the members of
    // members has members name, type, and value
    const isMapping = ({ type, members, keyType }: any) =>
      type === "mapping" && keyType && members;
    const isStruct = ({ type, members, keyType }: any) =>
      type !== "mapping" && keyType === undefined &&
        typeof members === "object" &&
        Object.values(members).every(
          (member: any) => member.name && member.type && member.value);

    // converts integer mapping keys to BN
    // converts bool mapping keys to boolean
    // leaves all else alone
    const convertKey = (keyType: string, key: string) => {
      if(keyType.match(/int/)) {
	return new BN(key, 10);
      }
      if(keyType === "bool") {
        return key === "true"; 
      }
      return key;
    };

    // converts a mapping representation into a JS Map
    // Only converts integer types to BN right now and handles booleans,
    // leaving other keys alone
    const toMap = ({ keyType, members }: any): Map<any, any> => {
      return new Map([
        ...Object.entries(members)
          .map(
            ([key, value]: any) =>
              ([convertKey(keyType, key), cleanContainers(value)])
          )
      ] as any);
    };

    // converts a struct representation into a JS object
    const toStruct = ({ members }: any): any =>
      Object.assign({}, ...Object.entries(members).map(
        ([key, value]: any) =>
          ({[key]: cleanContainers(value.value)})));

    // BNs are treated like primitives; must take precedence over generic obj
    if (BN.isBN(value)) {
      return value;
    }

    // detect mapping
    else if (value && typeof value === "object" && isMapping(value)) {
      return toMap(value);
    }

    // detect struct
    else if (value && typeof value === "object" && isStruct(value)) {
      return toStruct(value);
    }

    // detect arrays or anything with `.map()`, and recurse
    else if (value && value.map != undefined) {
      return value.map( (inner: any) => cleanContainers(inner) );
    }

    // detect objects and recurse
    else if (value && typeof value == "object") {
      return Object.assign(
        {}, ...Object.entries(value).map(
          ([key, inner]) => ({ [key]: cleanContainers(inner) })
        )
      );
    }

    // catch-all: no-change
    else {
      return value;
    }
  }
}
