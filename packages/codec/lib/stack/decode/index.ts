import debugModule from "debug";
const debug = debugModule("codec:stack:decode");

import * as AbiData from "@truffle/codec/abi-data";
import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import read from "@truffle/codec/read";
import * as Basic from "@truffle/codec/basic";
import * as Memory from "@truffle/codec/memory";
import * as Storage from "@truffle/codec/storage";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import { DecodingError } from "@truffle/codec/errors";

export function* decodeStack(
  dataType: Format.Types.Type,
  pointer: Pointer.StackPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, info.state);
  } catch (error) {
    if (error instanceof DecodingError) {
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
  const literalPointer: Pointer.StackLiteralPointer = {
    location: "stackliteral" as const,
    literal: rawValue
  };
  return yield* decodeLiteral(dataType, literalPointer, info);
}

export function* decodeLiteral(
  dataType: Format.Types.Type,
  pointer: Pointer.StackLiteralPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  debug("type %O", dataType);
  debug("pointer %o", pointer);

  if (Format.Types.isReferenceType(dataType)) {
    switch (dataType.location) {
      case "memory":
        //first: do we have a memory pointer? if so we can just dispatch to
        //decodeMemoryReference
        return yield* Memory.Decode.decodeMemoryReferenceByAddress(
          dataType,
          pointer,
          info
        );

      case "storage":
        //next: do we have a storage pointer (which may be a mapping)? if so, we can
        //we dispatch to decodeStorageByAddress
        return yield* Storage.Decode.decodeStorageReferenceByAddress(
          dataType,
          pointer,
          info
        );

      case "calldata":
        //next: do we have a calldata pointer?

        //if it's a lookup type, it'll need special handling
        if (
          dataType.typeClass === "bytes" ||
          dataType.typeClass === "string" ||
          (dataType.typeClass === "array" && dataType.kind === "dynamic")
        ) {
          const lengthAsBN = Conversion.toBN(
            pointer.literal.slice(Evm.Utils.WORD_SIZE)
          );
          const locationOnly = pointer.literal.slice(0, Evm.Utils.WORD_SIZE);
          return yield* AbiData.Decode.decodeAbiReferenceByAddress(
            dataType,
            { location: "stackliteral" as const, literal: locationOnly },
            info,
            {
              abiPointerBase: 0, //let's be explicit
              lengthOverride: lengthAsBN
            }
          );
        } else {
          //multivalue case -- this case is straightforward
          return yield* AbiData.Decode.decodeAbiReferenceByAddress(
            dataType,
            pointer,
            info,
            {
              abiPointerBase: 0 //let's be explicit
            }
          );
        }
    }
  }

  //next: do we have an external function?  these work differently on the stack
  //than elsewhere, so we can't just pass it on to decodeBasic.
  if (dataType.typeClass === "function" && dataType.visibility === "external") {
    let address = pointer.literal.slice(0, Evm.Utils.WORD_SIZE);
    let selectorWord = pointer.literal.slice(-Evm.Utils.WORD_SIZE);
    if (
      !Basic.Decode.checkPaddingLeft(address, Evm.Utils.ADDRESS_SIZE) ||
      !Basic.Decode.checkPaddingLeft(selectorWord, Evm.Utils.SELECTOR_SIZE)
    ) {
      return {
        type: dataType,
        kind: "error" as const,
        error: {
          kind: "FunctionExternalStackPaddingError" as const,
          rawAddress: Conversion.toHexString(address),
          rawSelector: Conversion.toHexString(selectorWord)
        }
      };
    }
    let selector = selectorWord.slice(-Evm.Utils.SELECTOR_SIZE);
    return {
      type: dataType,
      kind: "value" as const,
      value: yield* Basic.Decode.decodeExternalFunction(address, selector, info)
    };
  }

  //finally, if none of the above hold, we can just dispatch to decodeBasic.
  //however, note that because we're on the stack, we use the permissive padding
  //option so that errors won't result due to values with bad padding
  //(of numeric or bytesN type, anyway)
  return yield* Basic.Decode.decodeBasic(dataType, pointer, info, {
    paddingMode: "permissive"
  });
}
