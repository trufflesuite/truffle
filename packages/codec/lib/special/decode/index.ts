import debugModule from "debug";
const debug = debugModule("codec:special:decode");

import * as Format from "@truffle/codec/format";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import * as Compiler from "@truffle/codec/compiler";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";

export function* decodeSpecial(
  dataType: Format.Types.Type,
  pointer: Pointer.SpecialPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  if (dataType.typeClass === "magic") {
    return yield* decodeMagic(dataType, pointer, info);
  } else {
    return yield* Basic.Decode.decodeBasic(dataType, pointer, info);
  }
}

export function* decodeMagic(
  dataType: Format.Types.MagicType,
  pointer: Pointer.SpecialPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.MagicResult, Uint8Array> {
  let { state } = info;

  switch (pointer.special) {
    case "msg":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          data: yield* Bytes.Decode.decodeBytes(
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
          sig: yield* Basic.Decode.decodeBasic(
            {
              typeClass: "bytes" as const,
              kind: "static" as const,
              length: Evm.Utils.SELECTOR_SIZE
            },
            {
              location: "calldata" as const,
              start: 0,
              length: Evm.Utils.SELECTOR_SIZE
            },
            info
          ),
          sender: yield* Basic.Decode.decodeBasic(
            senderType(info.currentContext.compiler),
            { location: "special" as const, special: "sender" },
            info
          ),
          value: yield* Basic.Decode.decodeBasic(
            {
              typeClass: "uint",
              bits: 256
            },
            { location: "special" as const, special: "value" },
            info
          )
        }
      };
    case "tx":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          origin: yield* Basic.Decode.decodeBasic(
            externalAddressType(info.currentContext.compiler),
            { location: "special" as const, special: "origin" },
            info
          ),
          gasprice: yield* Basic.Decode.decodeBasic(
            {
              typeClass: "uint" as const,
              bits: 256
            },
            { location: "special" as const, special: "gasprice" },
            info
          )
        }
      };
    case "block":
      let block: { [field: string]: Format.Values.Result } = {
        coinbase: yield* Basic.Decode.decodeBasic(
          externalAddressType(info.currentContext.compiler),
          { location: "special" as const, special: "coinbase" },
          info
        )
      };
      //the other ones are all uint's, so let's handle them all at once; due to
      //the lack of generator arrow functions, we do it by mutating block
      const variables = ["difficulty", "gaslimit", "number", "timestamp"];
      for (let variable of variables) {
        block[variable] = yield* Basic.Decode.decodeBasic(
          {
            typeClass: "uint" as const,
            bits: 256
          },
          { location: "special" as const, special: variable },
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

//NOTE: this is likely going to change again in 0.7.x!  be ready!
function senderType(
  compiler: Compiler.CompilerVersion
): Format.Types.AddressType {
  switch (Compiler.Utils.solidityFamily(compiler)) {
    case "unknown":
    case "pre-0.5.0":
      return {
        typeClass: "address",
        kind: "general"
      };
    case "0.5.x":
      return {
        typeClass: "address",
        kind: "specific",
        payable: true
      };
  }
}

function externalAddressType(
  compiler: Compiler.CompilerVersion
): Format.Types.AddressType {
  switch (Compiler.Utils.solidityFamily(compiler)) {
    case "unknown":
    case "pre-0.5.0":
      return {
        typeClass: "address",
        kind: "general"
      };
    case "0.5.x":
      return {
        typeClass: "address",
        kind: "specific",
        payable: true
      };
  }
}
