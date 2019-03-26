import debugModule from "debug";
const debug = debugModule("decoder:decode:special");

import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { EvmInfo } from "../types/evm";
import { SpecialPointer } from "../types/pointer";

export default async function decodeSpecial(definition: DecodeUtils.AstDefinition, pointer: SpecialPointer, info: EvmInfo): Promise <any> {
  if(DecodeUtils.Definition.typeClass(definition) === "magic") { //that's right, magic!
    return await decodeMagic(definition, pointer, info);
  }
  else {
    return await decodeValue(definition, pointer, info);
  }
}

export async function decodeMagic(definition: DecodeUtils.AstDefinition, pointer: SpecialPointer, info: EvmInfo): Promise <any> {

  let {state} = info;

  switch(pointer.special) {
    case "msg":
      return {
        data: await decodeValue(
          DecodeUtils.Definition.MSG_DATA_DEFINITION,
          {calldata: {
            start: 0,
            length: state.calldata.length
          }},
          info
        ),
        sig: await decodeValue(
          DecodeUtils.Definition.MSG_SIG_DEFINITION,
          {calldata: {
            start: 0,
            length: DecodeUtils.EVM.SELECTOR_SIZE,
          }},
          info
        ),
        sender: await decodeValue(
          DecodeUtils.Definition.spoofAddressPayableDefinition("sender"),
          {special: "sender"},
          info
        ),
        value: await decodeValue(
          DecodeUtils.Definition.spoofUintDefinition("value"),
          {special: "value"},
          info
        )
      };
    case "tx":
      return {
        origin: await decodeValue(
          DecodeUtils.Definition.spoofAddressPayableDefinition("origin"),
          {special: "origin"},
          info
        ),
        gasprice: await decodeValue(
          DecodeUtils.Definition.spoofUintDefinition("gasprice"),
          {special: "gasprice"},
          info
        )
      };
    case "block":
      return {
        coinbase: await decodeValue(
          DecodeUtils.Definition.spoofAddressPayableDefinition("coinbase"),
          {special: "coinbase"},
          info
        ),
        //the other ones are all uint's, so let's handle them all at once
        ...Object.assign({},
          ...await Promise.all(
            ["difficulty", "gaslimit", "number", "timestamp"].map(
              async (variable) => ({
                [variable]: await decodeValue(
                  DecodeUtils.Definition.spoofUintDefinition(variable),
                  {special: variable},
                  info
                )
              })
            )
          )
        )
      };
    default:
      debug("Unrecognized magic variable!");
  }
}
