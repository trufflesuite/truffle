import debugModule from "debug";
const debug = debugModule("codec:interface:abify");

import { CalldataDecoding, LogDecoding } from "../types/decoding";
import { abifyResult, Types } from "truffle-codec-utils";

/* the following functions are not used anywhere in our code at present.
 * they are intended for external use -- the idea is that if you don't
 * like having to deal with the possibility of having the decoder return
 * either a full-mode or an abi-mode decoding, well, you can always
 * abify to ensure you get an abi-mode decoding.
 * (if you want to ensure you get a full-mode decoding... well, you can't,
 * but you can, uh, throw an exception if you don't, I guess.)
 */

export function abifyCalldataDecoding(decoding: CalldataDecoding, userDefinedTypes: Types.TypesById): CalldataDecoding {
  if(decoding.decodingMode === "abi") {
    return decoding;
  }
  switch(decoding.kind) {
    case "function":
    case "constructor":
      return {
        ...decoding,
        decodingMode: "abi",
        arguments: decoding.arguments.map(
          ({name, value}) => ({name, value: abifyResult(value, userDefinedTypes)})
        )
      };
    default:
      return {
        ...decoding,
        decodingMode: "abi"
      };
  }
}

export function abifyLogDecoding(decoding: LogDecoding, userDefinedTypes: Types.TypesById): LogDecoding {
  if(decoding.decodingMode === "abi") {
    return decoding;
  }
  return {
    ...decoding,
    decodingMode: "abi",
    arguments: decoding.arguments.map(
      ({name, value}) => ({name, value: abifyResult(value, userDefinedTypes)})
    )
  };
}
