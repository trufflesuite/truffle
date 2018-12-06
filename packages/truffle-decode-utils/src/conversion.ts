import BN from "bn.js";

export namespace Conversion {
  /**
   * @param bytes - undefined | string | number | BN | Uint8Array
   * @return {BN}
   */
  export function toBN(bytes: undefined | string | number | BN | Uint8Array): BN {
    if (bytes == undefined) {
      return undefined;
    } else if (typeof bytes == "string") {
      return new BN(bytes, 16);
    } else if (typeof bytes == "number" || BN.isBN(bytes)) {
      return new BN(bytes);
    } else if (bytes.reduce) {
      return bytes.reduce(
        (num: BN, byte: number) => num.muln(0x100).addn(byte),
        new BN(0)
      );
    }
  }

  /**
   * @param bytes - Uint8Array
   * @return {BN}
   */
  export function toSignedBN(bytes: Uint8Array): BN {
    if (bytes[0] < 0b10000000) {  // first bit is 0
      return toBN(bytes);
    } else {
      return toBN(bytes.map( (b) => 0xff - b )).addn(1).neg();
    }
  }

  /**
   * @param bytes - Uint8Array | BN
   * @param length - number | boolean - desired byte length (pad with zeroes)
   * @param trim - boolean - omit leading zeroes
   * @return {string}
   */
  export function toHexString(bytes: Uint8Array | BN, length: number | boolean = 0, trim: boolean = false): string {
    if (typeof length == "boolean") {
      trim = length;
      length = 0;
    }

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
    if (bytes.length < length) {
      let prior = bytes;
      bytes = new Uint8Array(length);

      bytes.set(prior, length - prior.length);
    }

    // debug("bytes: %o", bytes);

    let string = bytes.reduce(
      (str, byte) => `${str}${pad(byte.toString(16))}`, ""
    );

    if (trim) {
      string = string.replace(/^(00)+/, "");
    }

    if (string.length == 0) {
      string = "00";
    }

    return `0x${string}`;
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
   * Convert a mapping representation into a JS Map
   *
   * Only converts integer types to BN right now, leaving other keys else alone
   */
  export function toMap(
    { keyType, members }: any,
    convertValue?: (value: any) => any
  ): Map<any, any> {
    // convert integer types to BN, unless string representation is hex
    const convertKey = (key: string) => {
      if (keyType.match(/int/) && key.slice(0,2) != "0x") {
        return new BN(key, 10);
      } else {
        return key;
      }
    }

    convertValue = convertValue || (x => x);

    // populate Map with members, using converted keys/values
    return new Map([
      ...Object.entries(members)
        .map( ([key, value]: any) => ([convertKey(key), convertValue(value)]) )
    ] as any);
  }

  /**
   * recursively converts decoder-native mapping values to JS Map objects
   *
   * detects int and uint Solidity types and uses BNs as keys in such
   * situations
   *
   * all other keys are just kept as strings right now
   */
  export function cleanMappings(value: any): any {
    // HACK detect mappings as any object with certain *truthy* properties,
    // where `type` has explicit value `"mapping"`
    //
    // note that this means we can't decode a Solidity struct of this form.
    const isMapping = ({ type, members, keyType }: any) =>
      type === "mapping" && keyType && members;

    // BNs are treated like primitives; must take precedence over generic obj
    if (BN.isBN(value)) {
      return value;
    }

    // detect mapping
    else if (value && typeof value === "object" && isMapping(value)) {
      return toMap(value, cleanMappings);
    }

    // detect arrays or anything with `.map()`, and recurse
    else if (value && value.map != undefined) {
      return value.map( (inner: any) => cleanMappings(inner) );
    }

    // detect objects and recurse
    else if (value && typeof value == "object") {
      return Object.assign(
        {}, ...Object.entries(value).map(
          ([key, inner]) => ({ [key]: cleanMappings(inner) })
        )
      );
    }

    // catch-all: no-change
    else {
      return value;
    }
  }
}
