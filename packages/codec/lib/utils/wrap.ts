import debugModule from "debug";
const debug = debugModule("codec:utils:wrap");

import Web3 from "web3";
import BN from "bn.js";
import { CompilerVersion } from "@truffle/codec/types/compiler";
import { AstDefinition } from "@truffle/codec/types/ast";
import { MakeType } from "./maketype";
import { Types, Values } from "@truffle/codec/format";

//Function for wrapping a value as an ElementaryValue
//WARNING: this function does not check its inputs! Please check before using!
//How to use:
//numbers may be BN, number, or numeric string
//strings should be given as strings. duh.
//bytes should be given as hex strings beginning with "0x"
//addresses are like bytes; checksum case is not required
//booleans may be given either as booleans, or as string "true" or "false"
//[NOTE: in the future this function will:
//1. check its inputs,
//2. take a slightly different input format,
//3. also be named differently and... it'll be different :P ]
export function wrapElementaryViaDefinition(value: any, definition: AstDefinition, compiler: CompilerVersion): Values.ElementaryValue {
  let dataType = MakeType.definitionToType(definition, compiler, null); //force location to undefined
  return wrapElementaryValue(value, dataType);
}

export function wrapElementaryValue(value: any, dataType: Types.Type): Values.ElementaryValue {
  switch(dataType.typeClass) {
    case "string":
      return {
        type: dataType,
        kind: "value",
        value: {
          kind: "valid",
          asString: <string>value
        }
      };
    case "bytes":
      //NOTE: in the future should add padding for static case
      return <Values.BytesValue> { //TS is so bad at unions
        type: dataType,
        kind: "value",
        value: {
          asHex: value
        }
      };
    case "address":
      value = Web3.utils.toChecksumAddress(value);
      return {
        type: dataType,
        kind: "value",
        value: {
          asAddress: <string>value
        }
      };
    case "uint":
    case "int":
      if(value instanceof BN) {
        value = value.clone();
      }
      else {
        value = new BN(value);
      }
      return <Values.UintValue|Values.IntValue> { //TS remains bad at unions
        type: dataType,
        kind: "value",
        value: {
          asBN: value
        }
      };
    case "bool":
      if(typeof value === "string") {
        value = value !== "false";
      }
      return {
        type: dataType,
        kind: "value",
        value: {
          asBoolean: <boolean>value
        }
      };
    //fixed and ufixed are not handled for now!
  }
}
