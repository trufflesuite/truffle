import debugModule from "debug";
const debug = debugModule("decoder:decode:special");

import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { EvmInfo } from "../types/evm";
import { SpecialPointer } from "../types/pointer";
import { DecoderRequest } from "../types/request";

export default function* decodeSpecial(definition: DecodeUtils.AstDefinition, pointer: SpecialPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  if(DecodeUtils.Definition.typeClass(definition) === "magic") { //that's right, magic!
    return yield* decodeMagic(definition, pointer, info);
  }
  else {
    return yield* decodeValue(definition, pointer, info);
  }
}

export function* decodeMagic(definition: DecodeUtils.AstDefinition, pointer: SpecialPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {

  let {state} = info;

  switch(pointer.special) {
    case "msg":
      return {
        data: yield* decodeValue(
          DecodeUtils.Definition.MSG_DATA_DEFINITION,
          {calldata: {
            start: 0,
            length: state.calldata.length
          }},
          info
        ),
        sig: yield* decodeValue(
          DecodeUtils.Definition.MSG_SIG_DEFINITION,
          {calldata: {
            start: 0,
            length: DecodeUtils.EVM.SELECTOR_SIZE,
          }},
          info
        ),
        sender: yield* decodeValue(
          DecodeUtils.Definition.spoofAddressPayableDefinition("sender"),
          {special: "sender"},
          info
        ),
        value: yield* decodeValue(
          DecodeUtils.Definition.spoofUintDefinition("value"),
          {special: "value"},
          info
        )
      };
    case "tx":
      return {
        origin: yield* decodeValue(
          DecodeUtils.Definition.spoofAddressPayableDefinition("origin"),
          {special: "origin"},
          info
        ),
        gasprice: yield* decodeValue(
          DecodeUtils.Definition.spoofUintDefinition("gasprice"),
          {special: "gasprice"},
          info
        )
      };
    case "block":
      let block: any = {
        coinbase: yield* decodeValue(
          DecodeUtils.Definition.spoofAddressPayableDefinition("coinbase"),
          {special: "coinbase"},
          info
        )
      };
      //the other ones are all uint's, so let's handle them all at once; due to
      //the lack of generator arrow functions, we do it by mutating block
      const variables = ["difficulty", "gaslimit", "number", "timestamp"];
      for (let variable of variables) {
        block[variable] = yield* decodeValue(
          DecodeUtils.Definition.spoofUintDefinition(variable),
          {special: variable},
          info
        );
      }
    return block;
    default:
      debug("Unrecognized magic variable!");
  }
}
