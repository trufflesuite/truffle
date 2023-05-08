import debugModule from "debug";
const debug = debugModule("codec:special:decode");

import type * as Format from "@truffle/codec/format";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import * as Compiler from "@truffle/codec/compiler";
import type * as Pointer from "@truffle/codec/pointer";
import type { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";

export function* decodeSpecial(
  dataType: Format.Types.Type,
  pointer: Pointer.SpecialPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array | null> {
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
): Generator<DecoderRequest, Format.Values.MagicResult, Uint8Array | null> {
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
        },
        interpretations: {}
      };
    case "tx":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          origin: yield* Basic.Decode.decodeBasic(
            senderType(info.currentContext.compiler),
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
        },
        interpretations: {}
      };
    case "block":
      let block: { [field: string]: Format.Values.Result } = {
        coinbase: yield* Basic.Decode.decodeBasic(
          coinbaseType(info.currentContext.compiler),
          { location: "special" as const, special: "coinbase" },
          info
        )
      };
      //now we handle prevrandao. this one gets special handling
      //because the name isn't equal to the location name (it's an alias of difficulty)
      if (solidityVersionHasPrevrandao(info.currentContext.compiler)) {
        block.prevrandao = yield* Basic.Decode.decodeBasic(
          {
            typeClass: "uint" as const,
            bits: 256
          },
          { location: "special" as const, special: "difficulty" },
          info
        );
      }
      //the other ones are all uint's and all work the same, so let's handle
      //them all at once; due to the lack of generator arrow functions, we do
      //it by mutating block
      const variables = ["difficulty", "gaslimit", "number", "timestamp"];
      if (solidityVersionHasChainId(info.currentContext.compiler)) {
        variables.push("chainid");
      }
      if (solidityVersionHasBaseFee(info.currentContext.compiler)) {
        variables.push("basefee");
      }
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
        value: block,
        interpretations: {}
      };
  }
}

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
    default:
      return {
        typeClass: "address",
        kind: "specific",
        payable: false
      };
  }
}

function coinbaseType(
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
    case "0.8.x":
    case "0.8.7+":
    case "0.8.9+":
    case "0.8.18+":
      return {
        typeClass: "address",
        kind: "specific",
        payable: true
      };
  }
}

function solidityVersionHasChainId(
  compiler: Compiler.CompilerVersion
): boolean {
  switch (Compiler.Utils.solidityFamily(compiler)) {
    case "unknown":
    case "pre-0.5.0":
    case "0.5.x":
      return false;
    default:
      return true;
  }
}

function solidityVersionHasBaseFee(
  compiler: Compiler.CompilerVersion
): boolean {
  switch (Compiler.Utils.solidityFamily(compiler)) {
    case "unknown":
    case "pre-0.5.0":
    case "0.5.x":
    case "0.8.x":
      return false;
    default:
      return true;
  }
}

function solidityVersionHasPrevrandao(
  compiler: Compiler.CompilerVersion
): boolean {
  switch (Compiler.Utils.solidityFamily(compiler)) {
    case "unknown":
    case "pre-0.5.0":
    case "0.5.x":
    case "0.8.x":
    case "0.8.7+":
    case "0.8.9+":
      return false;
    default:
      return true;
  }
}
