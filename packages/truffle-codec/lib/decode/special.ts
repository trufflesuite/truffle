import debugModule from "debug";
const debug = debugModule("codec:decode:special");

import * as CodecUtils from "truffle-codec-utils";
import { Types, Values } from "truffle-codec-utils";
import decodeValue from "./value";
import { EvmInfo } from "../types/evm";
import { SpecialPointer } from "../types/pointer";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeSpecial(dataType: Types.Type, pointer: SpecialPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(dataType.typeClass === "magic") {
    return yield* decodeMagic(dataType, pointer, info);
  }
  else {
    return yield* decodeValue(dataType, pointer, info);
  }
}

export function* decodeMagic(dataType: Types.MagicType, pointer: SpecialPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  //note: that's Values.Result and not Values.MagicResult due to some TypeScript generator jank

  let {state} = info;

  switch(pointer.special) {
    case "msg":
      return {
        type: dataType,
        kind: "value",
        value: {
          data: <Values.BytesDynamicResult> (yield* decodeValue(
            {
              typeClass: "bytes",
              kind: "dynamic",
              location: "calldata"
            },
            {
              location: "calldata",
              start: 0,
              length: state.calldata.length
            },
            info
          )),
          sig: <Values.BytesStaticResult> (yield* decodeValue(
            {
              typeClass: "bytes",
              kind: "static",
              length: CodecUtils.EVM.SELECTOR_SIZE
            },
            {
              location: "calldata",
              start: 0,
              length: CodecUtils.EVM.SELECTOR_SIZE,
            },
            info
          )),
          sender: <Values.AddressResult> (yield* decodeValue(
            {
              typeClass: "address",
              payable: true
            },
            {location: "special", special: "sender"},
            info
          )),
          value: <Values.UintResult> (yield* decodeValue(
            {
              typeClass: "uint",
              bits: 256
            },
            {location: "special", special: "value"},
            info
          ))
        }
      };
    case "tx":
      return {
        type: dataType,
        kind: "value",
        value: {
          origin: <Values.AddressResult> (yield* decodeValue(
            {
              typeClass: "address",
              payable: true
            },
            {location: "special", special: "origin"},
            info
          )),
          gasprice: <Values.UintResult> (yield* decodeValue(
            {
              typeClass: "uint",
              bits: 256
            },
            {location: "special", special: "gasprice"},
            info
          ))
        }
      };
    case "block":
      let block: {[field: string]: Values.Result} = {
        coinbase: <Values.AddressResult> (yield* decodeValue(
          {
            typeClass: "address",
            payable: true
          },
          {location: "special", special: "coinbase"},
          info
        ))
      };
      //the other ones are all uint's, so let's handle them all at once; due to
      //the lack of generator arrow functions, we do it by mutating block
      const variables = ["difficulty", "gaslimit", "number", "timestamp"];
      for (let variable of variables) {
        block[variable] = <Values.UintResult> (yield* decodeValue(
          {
            typeClass: "uint",
            bits: 256
          },
          {location: "special", special: variable},
          info
        ));
      }
      return {
        type: dataType,
        kind: "value",
        value: block
      };
  }
}
