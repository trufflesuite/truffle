import debugModule from "debug";
const debug = debugModule("codec:export");

import * as Abify from "./abify";
import * as Format from "@truffle/codec/format";
import {
  LogDecoding,
  ReturndataDecoding
} from "@truffle/codec/types";

import { ResultInspector, nativize } from "@truffle/codec/format/utils/inspect";
export { ResultInspector, nativize };

type NumberFormatter = (n: BigInt) => any //not parameterized since we output any anyway

/**
 * This function is similar to [[Format.Utils.Inspect.nativize|nativize]], but
 * is intended to match the way that Truffle Contract currently returns values
 * (based on the Ethers decoder).  As such, it only handles ABI types, and in
 * addition does not handle the types fixed, ufixed, or function.  Note that in
 * these cases it returns `undefined` rather than throwing, as we want this
 * function to be used in contexts where it had better not throw.  It also does
 * not handle circularities, for similar reasons.
 *
 * To handle numeric types, this function takes an optional second argument,
 * numberFormatter, that tells it how to handle numbers; this function should
 * take a BigInt as input.  By default, this function will be the identity,
 * and so numbers will be represented as BigInts.
 *
 * Note that this function begins by calling abify, so out-of-range enums (that
 * aren't so out-of-range as to be padding errors) will not return `undefined`.
 * Out-of-range booleans similarly will return true rather than `undefined`.
 * However, other range errors may return `undefined`; this may technically be a
 * slight incompatibility with existing behavior, but should not be relevant
 * except in quite unusual cases.
 *
 * In order to match the behavior for tuples, tuples will be transformed into
 * arrays, but named entries will additionally be keyed by name.  Moreover,
 * indexed variables of reference type will be nativized to an undecoded hex
 * string.
 */
export function compatibleNativize(
  result: Format.Values.Result,
  numberFormatter: NumberFormatter = x => x
): any {
  return compatibleNativizeAbified(
    Abify.abifyResult(result),
    numberFormatter
  );
}

//HACK; this was going to be parameterized
//but TypeScript didn't like that, so, whatever
interface MixedArray extends Array<any> {
  [key: string]: any
}

function compatibleNativizeAbified(
  result: Format.Values.Result,
  numberFormatter: NumberFormatter
): any {
  if (result.kind === "error") {
    switch (result.error.kind) {
      case "BoolOutOfRangeError":
        return true;
      case "IndexedReferenceTypeError":
        //strictly speaking for arrays ethers will fail to decode
        //rather than do this, but, eh
        return result.error.raw;
      default:
        return undefined;
    }
  }
  switch (result.type.typeClass) {
    case "uint":
    case "int":
      const asBN = (<Format.Values.UintValue | Format.Values.IntValue>(
        result
      )).value.asBN;
      //BN is binary-based, so we convert by means of a hex string in order
      //to avoid having to do a binary-decimal conversion and back :P
      const asBigInt = !asBN.isNeg()
        ? BigInt("0x" + asBN.toString(16))
        : -BigInt("0x" + asBN.neg().toString(16)); //can't directly make negative BigInt from hex string
      return numberFormatter(asBigInt);
    case "bool":
      return (<Format.Values.BoolValue>result).value.asBoolean;
    case "bytes":
      return (<Format.Values.BytesValue>result).value.asHex;
    case "address":
      return (<Format.Values.AddressValue>result).value.asAddress;
    case "string": {
      let coercedResult = <Format.Values.StringValue>result;
      switch (coercedResult.value.kind) {
        case "valid":
          return coercedResult.value.asString;
        case "malformed":
          // this will turn malformed utf-8 into replacement characters (U+FFFD) (WARNING)
          // note we need to cut off the 0x prefix
          return Buffer.from(
            coercedResult.value.asHex.slice(2),
            "hex"
          ).toString();
      }
    }
    case "array":
      return (<Format.Values.ArrayValue>result).value.map(value =>
        compatibleNativizeAbified(value, numberFormatter)
      );
    case "tuple":
      //in this case, we need the result to be an array, but also
      //to have the field names (where extant) as keys
      const nativized: MixedArray = [];
      for (const { name, value } of (<Format.Values.TupleValue>result).value) {
        const nativizedValue = compatibleNativizeAbified(value, numberFormatter);
        nativized.push(nativizedValue);
        if (name) {
          nativized[name] = nativizedValue;
        }
      }
      return nativized;
    case "fixed":
    case "ufixed":
    case "function":
      return undefined;
  }
}

/**
 * This function is similar to [[compatibleNativize]], but takes
 * a [[ReturndataDecoding]].  If there's only one returned value, it
 * will be run through compatibleNativize but otherwise unaltered;
 * otherwise the results will be put in an object.
 *
 * Note that if the ReturndataDecoding is not a [[ReturnDecoding]],
 * this will just return `undefined`.
 */
export function compatibleNativizeReturn(
  decoding: ReturndataDecoding,
  numberFormatter: NumberFormatter = x => x
): any {
  if (decoding.kind !== "return") {
    return undefined;
  }
  if (decoding.arguments.length === 1) {
    return compatibleNativize(decoding.arguments[0].value);
  }
  const result: any = {};
  for (let i = 0; i < decoding.arguments.length; i++) {
    const { name, value } = decoding.arguments[i];
    const nativized = compatibleNativize(value, numberFormatter);
    result[i] = nativized;
    if (name) {
      result[name] = nativized;
    }
  }
  return result;
}

/**
 * This function is similar to [[compatibleNativize]], but takes
 * a [[LogDecoding]], and puts the results in an object.  Note
 * that this does not return the entire event info, but just the
 * `args` for the event.
 */
export function compatibleNativizeEventArgs(
  decoding: LogDecoding,
  numberFormatter: NumberFormatter = x => x
): any {
  const result: any = {};
  for (let i = 0; i < decoding.arguments.length; i++) {
    const { name, value } = decoding.arguments[i];
    const nativized = compatibleNativize(value, numberFormatter);
    result[i] = nativized;
    if (name) {
      result[name] = nativized;
    }
  }
  result.__length__ = decoding.arguments.length;
  return result;
}
