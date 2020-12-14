import debugModule from "debug";
const debug = debugModule("codec:bytes:decode");

import read from "@truffle/codec/read";
import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest, DecoderOptions } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import { DecodingError, StopDecodingError } from "@truffle/codec/errors";
import utf8 from "utf8";

export function* decodeBytes(
  dataType: Format.Types.BytesTypeDynamic | Format.Types.StringType,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  const { state } = info;
  const { strictAbiMode: strict } = options; //if this is undefined it'll still be falsy so OK

  let bytes: Uint8Array;
  try {
    bytes = yield* read(pointer, state);
  } catch (error) {
    //error: DecodingError
    debug("segfault, pointer %o, state: %O", pointer, state);
    if (error instanceof DecodingError) {
      if (strict) {
        throw new StopDecodingError(error.error);
      }
      return <Format.Errors.ErrorResult>{
        //no idea why TS is failing here
        type: dataType,
        kind: "error" as const,
        error: error.error
      };
    } else {
      throw error;
    }
  }

  debug("type %O", dataType);
  debug("pointer %o", pointer);

  //note: this function does not check padding

  switch (dataType.typeClass) {
    case "bytes":
      //we assume this is a dynamic bytestring!
      //static ones should go to decodeBasic!
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asHex: Conversion.toHexString(bytes)
        }
      };

    case "string":
      return {
        type: dataType,
        kind: "value" as const,
        value: decodeString(bytes)
      };
  }
}

export function decodeString(bytes: Uint8Array): Format.Values.StringValueInfo {
  //the following line takes our UTF-8 string... and interprets each byte
  //as a UTF-16 bytepair.  Yikes!  Fortunately, we have a library to repair that.
  let badlyEncodedString = String.fromCharCode.apply(undefined, bytes);
  try {
    //this will throw an error if we have malformed UTF-8
    let correctlyEncodedString = utf8.decode(badlyEncodedString);
    //NOTE: we don't use node's builtin Buffer class to do the UTF-8 decoding
    //here, because that handles malformed UTF-8 by means of replacement characters
    //(U+FFFD).  That loses information.  So we use the utf8 package instead,
    //and... well, see the catch block below.
    return {
      kind: "valid" as const,
      asString: correctlyEncodedString
    };
  } catch (_) {
    //we're going to ignore the precise error and just assume it's because
    //the string was malformed (what else could it be?)
    let hexString = Conversion.toHexString(bytes);
    return {
      kind: "malformed" as const,
      asHex: hexString
    };
  }
}
