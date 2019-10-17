import debugModule from "debug";
const debug = debugModule("codec:utils:conversion");

import BN from "bn.js";
import Big from "big.js";
import * as Format from "@truffle/codec/format";
import { enumFullName } from "./inspect";

/**
 * @param bytes - undefined | string | number | BN | Uint8Array | Big
 * @return {BN}
 */
export function toBN(bytes: undefined | string | number | BN | Uint8Array | Big): BN {
  if (bytes === undefined) {
    return undefined;
  } else if (typeof bytes == "string") {
    return new BN(bytes, 16);
  } else if (typeof bytes == "number" || BN.isBN(bytes)) {
    return new BN(bytes);
  } else if (bytes instanceof Big) {
    return new BN(bytes.toFixed()); //warning, better hope input is integer!
    //note: going through string may seem silly but it's actually not terrible here,
    //since BN is binary-based and Big is decimal-based
    //[toFixed is like toString except it guarantees scientific notation is not used]
  } else if (typeof bytes.reduce === "function") {
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

export function toBig(value: BN | number): Big {
  //note: going through string may seem silly but it's actually not terrible here,
  //since BN (& number) is binary-based and Big is decimal-based
  return new Big(value.toString());
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

  debug("bytes: %o", bytes);

  let string = bytes.reduce(
    (str, byte) => `${str}${pad(byte.toString(16))}`, ""
  );

  return `0x${string}`;
}


export function toBytes(data: BN | string | number | Big, length: number = 0): Uint8Array {
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
    // BN/Big/number case
    if(typeof data === "number") {
      data = new BN(data);
    }
    else if(data instanceof Big) {
      //note: going through string may seem silly but it's actually not terrible here,
      //since BN is binary-based and Big is decimal-based
      data = new BN(data.toFixed());
      //[toFixed is like toString except it guarantees scientific notation is not used]
    }

    //note that the argument for toTwos is given in bits
    return new Uint8Array(data.toTwos(length * 8).toArrayLike(Buffer, "be", length)); //big-endian
  }
}

//computes value * 10**decimalPlaces
export function shiftBigUp(value: Big, decimalPlaces: number): Big {
  let newValue = new Big(value);
  newValue.e += decimalPlaces;
  return newValue;
}

//computes value * 10**-decimalPlaces
export function shiftBigDown(value: Big, decimalPlaces: number): Big {
  let newValue = new Big(value);
  newValue.e -= decimalPlaces;
  return newValue;
}

//we don't need this yet, but we will eventually
export function countDecimalPlaces(value: Big): number {
  return Math.max(0, value.c.length - value.e - 1);
}

//NOTE: Definitely do not use this in real code!  For tests only!
//for convenience: invokes the nativize method on all the given variables
export function nativizeVariables(variables: {[name: string]: Format.Values.Result}): {[name: string]: any} {
  return Object.assign({}, ...Object.entries(variables).map(
    ([name, value]) => ({[name]: nativize(value)})
  ));
}

//converts out of range booleans to true; something of a HACK
//NOTE: does NOT do this recursively inside structs, arrays, etc!
//I mean, those aren't elementary and therefore aren't in the domain
//anyway, but still
export function cleanBool(result: Format.Values.ElementaryResult): Format.Values.ElementaryResult {
  switch(result.kind) {
    case "value":
      return result;
    case "error":
      switch(result.error.kind) {
        case "BoolOutOfRangeError":
          //return true
          return {
            type: <Format.Types.BoolType> result.type,
            kind: "value",
            value: {
              asBoolean: true
            }
          };
        default:
          return result;
      }
  }
}

//HACK! Avoid using! Only use this if:
//1. you absolutely have to, or
//2. it's just testing, not real code
export function nativize(result: Format.Values.Result): any {
  if(result.kind === "error") {
    return undefined;
  }
  switch(result.type.typeClass) {
    case "uint":
    case "int":
      return (<Format.Values.UintValue|Format.Values.IntValue>result).value.asBN.toNumber(); //WARNING
    case "bool":
      return (<Format.Values.BoolValue>result).value.asBoolean;
    case "bytes":
      return (<Format.Values.BytesValue>result).value.asHex;
    case "address":
      return (<Format.Values.AddressValue>result).value.asAddress;
    case "string": {
      let coercedResult = <Format.Values.StringValue> result;
      switch(coercedResult.value.kind) {
        case "valid":
          return coercedResult.value.asString;
        case "malformed":
          // this will turn malformed utf-8 into replacement characters (U+FFFD) (WARNING)
          // note we need to cut off the 0x prefix
          return Buffer.from(coercedResult.value.asHex.slice(2), 'hex').toString();
      }
    }
    case "fixed":
    case "ufixed":
      //HACK: Big doesn't have a toNumber() method, so we convert to string and then parse with Number
      //NOTE: we don't bother setting the magic variables Big.NE or Big.PE first, as the choice of
      //notation shouldn't affect the result (can you believe I have to write this? @_@)
      return Number((<Format.Values.FixedValue|Format.Values.UfixedValue>result).value.asBig.toString()); //WARNING
    case "array": //WARNING: circular case not handled; will loop infinitely
      return (<Format.Values.ArrayValue>result).value.map(nativize);
    case "mapping":
      return Object.assign({}, ...(<Format.Values.MappingValue>result).value.map(
        ({key, value}) => ({[nativize(key).toString()]: nativize(value)})
      ));
    case "struct": //WARNING: circular case not handled; will loop infinitely
      return Object.assign({}, ...(<Format.Values.StructValue>result).value.map(
        ({name, value}) => ({[name]: nativize(value)})
      ));
    case "tuple":
      return (<Format.Values.TupleValue>result).value.map(
        ({value}) => nativize(value)
      );
    case "magic":
      return Object.assign({}, ...Object.entries((<Format.Values.MagicValue>result).value).map(
          ([key, value]) => ({[key]: nativize(value)})
      ));
    case "enum":
      return enumFullName(<Format.Values.EnumValue>result);
    case "contract": {
      let coercedResult = <Format.Values.ContractValue> result;
      switch(coercedResult.value.kind) {
        case "known":
          return `${coercedResult.value.class.typeName}(${coercedResult.value.address})`;
        case "unknown":
          return coercedResult.value.address;
      }
      break; //to satisfy typescript
    }
    case "function":
      switch(result.type.visibility) {
        case "external": {
          let coercedResult = <Format.Values.FunctionExternalValue> result;
          switch(coercedResult.value.kind) {
            case "known":
              return `${coercedResult.value.contract.class.typeName}(${coercedResult.value.contract.address}).${coercedResult.value.abi.name}`
            case "invalid":
              return `${coercedResult.value.contract.class.typeName}(${coercedResult.value.contract.address}).call(${coercedResult.value.selector}...)`
            case "unknown":
              return `${coercedResult.value.contract.address}.call(${coercedResult.value.selector}...)`
          }
        }
        case "internal": {
          let coercedResult = <Format.Values.FunctionInternalValue> result;
          switch(coercedResult.value.kind) {
            case "function":
              return `${coercedResult.value.definedIn.typeName}.${coercedResult.value.name}`;
            case "exception":
              return coercedResult.value.deployedProgramCounter === 0
                ? `<zero>`
                : `assert(false)`;
            case "unknown":
              return `<decoding not supported>`;
          }
        }
      }
  }
}
