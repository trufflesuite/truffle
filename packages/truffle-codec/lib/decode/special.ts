import debugModule from "debug";
const debug = debugModule("codec:decode:special");

import * as CodecUtils from "truffle-codec-utils";
import { Types, Values, Errors } from "truffle-codec-utils";
import decodeValue from "./value";
import { EvmInfo } from "../types/evm";
import { SpecialPointer } from "../types/pointer";
import { DecoderRequest } from "../types/request";

export default function* decodeSpecial(dataType: Types.Type, pointer: SpecialPointer, info: EvmInfo): Generator<DecoderRequest, Values.Result, Uint8Array> {
  if(dataType.typeClass === "magic") {
    return yield* decodeMagic(dataType, pointer, info);
  }
  else {
    return yield* decodeValue(dataType, pointer, info);
  }
}

export function* decodeMagic(dataType: Types.MagicType, pointer: SpecialPointer, info: EvmInfo): Generator<DecoderRequest, Values.MagicResult, Uint8Array> {

  let {state} = info;

  switch(pointer.special) {
    case "msg":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          data: yield* decodeValue(
            {
              typeClass: "bytes" as const,
              kind: "dynamic" as const,
              location: "calldata" as const
            },
            {
              location: "calldata" as const,
              start: 0,
              length: state.calldata.length
            },
            info
          ),
          sig: yield* decodeValue(
            {
              typeClass: "bytes" as const,
              kind: "static" as const,
              length: CodecUtils.EVM.SELECTOR_SIZE
            },
            {
              location: "calldata" as const,
              start: 0,
              length: CodecUtils.EVM.SELECTOR_SIZE,
            },
            info
          ),
          sender: yield* decodeValue(
            {
              typeClass: "address" as const,
              payable: true
            },
            {location: "special" as const, special: "sender" },
            info
          ),
          value: yield* decodeValue(
            {
              typeClass: "uint",
              bits: 256
            },
            {location: "special" as const, special: "value" },
            info
          )
        }
      };
    case "tx":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          origin: yield* decodeValue(
            {
              typeClass: "address" as const,
              payable: true
            },
            {location: "special" as const, special: "origin"},
            info
          ),
          gasprice: yield* decodeValue(
            {
              typeClass: "uint" as const,
              bits: 256
            },
            {location: "special" as const, special: "gasprice"},
            info
          )
        }
      };
    case "block":
      let block: {[field: string]: Values.Result} = {
        coinbase: yield* decodeValue(
          {
            typeClass: "address" as const,
            payable: true
          },
          {location: "special" as const, special: "coinbase"},
          info
        )
      };
      //the other ones are all uint's, so let's handle them all at once; due to
      //the lack of generator arrow functions, we do it by mutating block
      const variables = ["difficulty", "gaslimit", "number", "timestamp"];
      for (let variable of variables) {
        block[variable] = yield* decodeValue(
          {
            typeClass: "uint" as const,
            bits: 256
          },
          {location: "special" as const, special: variable},
          info
        );
      }
      return {
        type: dataType,
        kind: "value" as const,
        value: block
      };
  }
}
