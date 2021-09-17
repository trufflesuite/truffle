import debugModule from "debug";
const debug = debugModule("decoder:utils");

import Web3Utils from "web3-utils";
import BN from "bn.js";

import type * as Codec from "@truffle/codec";

//Function for wrapping a value as an ElementaryValue
//(note: assumes any enum types are the full type)
//WARNING: this function does not check its inputs! Please check before using!
//How to use:
//numbers may be BN, number, or numeric string
//strings should be given as strings. duh.
//bytes should be given as hex strings beginning with "0x"
//addresses and contracts are like bytes; checksum case is not required
//booleans may be given either as booleans, or as string "true" or "false"
//enums may be given by name or by numeric value
//[NOTE: in the future this function will:
//1. check its inputs,
//2. take a slightly different input format,
//3. also be named differently and... it'll be different :P ]
export function wrapElementaryValue(
  value: any,
  dataType: Codec.Format.Types.ElementaryType
): Codec.Format.Values.ElementaryValue {
  switch (dataType.typeClass) {
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
      return {
        //TS is so bad at unions
        type: dataType,
        kind: "value",
        value: {
          asHex: <string>value
        }
      } as Codec.Format.Values.BytesValue;
    case "address":
      value = Web3Utils.toChecksumAddress(value);
      return {
        type: dataType,
        kind: "value",
        value: {
          asAddress: <string>value
        }
      };
    case "contract":
      value = Web3Utils.toChecksumAddress(value);
      return {
        type: dataType,
        kind: "value",
        value: {
          kind: "unknown",
          address: <string>value
        }
      };
    case "uint":
    case "int":
      if (BN.isBN(value)) {
        value = value.clone();
      } else {
        value = new BN(value);
      }
      return {
        type: dataType,
        kind: "value",
        value: {
          asBN: <BN>value
        }
      } as Codec.Format.Values.UintValue | Codec.Format.Values.IntValue;
    case "bool":
      if (typeof value === "string") {
        value = value !== "false";
      }
      return {
        type: dataType,
        kind: "value",
        value: {
          asBoolean: <boolean>value
        }
      };
    case "enum":
      let name: string;
      let numeric: BN;
      if (typeof value === "string" && !value.match(/^[0-9]*$/)) {
        //string case
        //first: let's strip off any type prefixes
        //(dangerous, I know! to be revised when this whole
        //function is)
        let splitName = value.split(".");
        name = splitName[splitName.length - 1];
        numeric = new BN(dataType.options.indexOf(name));
      } else {
        //numeric case
        if (BN.isBN(value)) {
          numeric = value.clone();
        } else {
          numeric = new BN(value);
        }
        name = dataType.options[numeric.toNumber()];
      }
      return {
        type: dataType,
        kind: "value",
        value: {
          name,
          numericAsBN: numeric
        }
      };
    //fixed and ufixed are not handled for now!
  }
}
