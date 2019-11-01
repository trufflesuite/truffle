import debugModule from "debug";
const debug = debugModule("codec:decode:stack");

import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import read from "@truffle/codec/read";
import * as Elementary from "@truffle/codec/elementary";
import { decodeMemoryReferenceByAddress } from "./memory";
import * as Storage from "@truffle/codec/storage";
// import { decodeStorageReferenceByAddress } from "@truffle/codec/storage";
import { decodeAbiReferenceByAddress } from "./abi";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import { DecodingError } from "@truffle/codec/decode/errors";

export default function* decodeStack(
  dataType: Format.Types.Type,
  pointer: Pointer.StackPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, info.state);
  } catch (error) {
    return <Format.Errors.ErrorResult>{
      //no idea why TS is failing here
      type: dataType,
      kind: "error" as const,
      error: (<DecodingError>error).error
    };
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
        return yield* decodeMemoryReferenceByAddress(dataType, pointer, info);

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

        //if it's a string or bytes, we will interpret the pointer ourself and skip
        //straight to decodeElementary.  this is to allow us to correctly handle the
        //case of msg.data used as a mapping key.
        if (dataType.typeClass === "bytes" || dataType.typeClass === "string") {
          let startAsBN = Conversion.toBN(
            pointer.literal.slice(0, Evm.Utils.WORD_SIZE)
          );
          let lengthAsBN = Conversion.toBN(
            pointer.literal.slice(Evm.Utils.WORD_SIZE)
          );
          let start: number;
          let length: number;
          try {
            start = startAsBN.toNumber();
          } catch (_) {
            return <
              | Format.Errors.BytesDynamicErrorResult
              | Format.Errors.StringErrorResult
            >{
              //again with the TS failures...
              type: dataType,
              kind: "error" as const,
              error: {
                kind: "OverlargePointersNotImplementedError" as const,
                pointerAsBN: startAsBN
              }
            };
          }
          try {
            length = lengthAsBN.toNumber();
          } catch (_) {
            return <
              | Format.Errors.BytesDynamicErrorResult
              | Format.Errors.StringErrorResult
            >{
              //again with the TS failures...
              type: dataType,
              kind: "error" as const,
              error: {
                kind: "OverlongArraysAndStringsNotImplementedError" as const,
                lengthAsBN
              }
            };
          }
          let newPointer = {
            location: "calldata" as "calldata",
            start,
            length
          };
          return yield* Elementary.Decode.decodeElementary(
            dataType,
            newPointer,
            info
          );
        }

        //otherwise, is it a dynamic array?
        if (dataType.typeClass === "array" && dataType.kind === "dynamic") {
          //in this case, we're actually going to *throw away* the length info,
          //because it makes the logic simpler -- we'll get the length info back
          //from calldata
          let locationOnly = pointer.literal.slice(0, Evm.Utils.WORD_SIZE);
          //HACK -- in order to read the correct location, we need to add an offset
          //of -32 (since, again, we're throwing away the length info), so we pass
          //that in as the "base" value
          return yield* decodeAbiReferenceByAddress(
            dataType,
            { location: "stackliteral" as const, literal: locationOnly },
            info,
            { abiPointerBase: -Evm.Utils.WORD_SIZE }
          );
        } else {
          //multivalue case -- this case is straightforward
          //pass in 0 as the base since this is an absolute pointer
          //(yeah we don't need to but let's be explicit)
          return yield* decodeAbiReferenceByAddress(dataType, pointer, info, {
            abiPointerBase: 0
          });
        }
    }
  }

  //next: do we have an external function?  these work differently on the stack
  //than elsewhere, so we can't just pass it on to decodeElementary.
  if (dataType.typeClass === "function" && dataType.visibility === "external") {
    let address = pointer.literal.slice(0, Evm.Utils.WORD_SIZE);
    let selectorWord = pointer.literal.slice(-Evm.Utils.WORD_SIZE);
    if (
      !Elementary.Decode.checkPaddingLeft(address, Evm.Utils.ADDRESS_SIZE) ||
      !Elementary.Decode.checkPaddingLeft(selectorWord, Evm.Utils.SELECTOR_SIZE)
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
      value: yield* Elementary.Decode.decodeExternalFunction(
        address,
        selector,
        info
      )
    };
  }

  //finally, if none of the above hold, we can just dispatch to decodeElementary.
  //however, note that because we're on the stack, we use the permissive padding
  //option so that errors won't result due to values with bad padding
  //(of numeric or bytesN type, anyway)
  return yield* Elementary.Decode.decodeElementary(dataType, pointer, info, {
    permissivePadding: true
  });
}
