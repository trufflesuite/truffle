import debugModule from "debug";
const debug = debugModule("codec:format:utils:maketype");

import BN from "bn.js";
import * as Format from "@truffle/codec/format/common";
import { AbiParameter } from "@truffle/codec/abi-data/types";

export function abiParameterToType(abi: AbiParameter): Format.Types.Type {
  let typeName = abi.type;
  let typeHint = abi.internalType;
  //first: is it an array?
  let arrayMatch = typeName.match(/(.*)\[(\d*)\]$/);
  if (arrayMatch) {
    let baseTypeName = arrayMatch[1];
    let lengthAsString = arrayMatch[2]; //may be empty!
    let baseAbi = { ...abi, type: baseTypeName };
    let baseType = abiParameterToType(baseAbi);
    if (lengthAsString === "") {
      return {
        typeClass: "array",
        kind: "dynamic",
        baseType,
        typeHint
      };
    } else {
      let length = new BN(lengthAsString);
      return {
        typeClass: "array",
        kind: "static",
        length,
        baseType,
        typeHint
      };
    }
  }
  //otherwise, here are the simple cases
  let typeClass = typeName.match(/^([^0-9]+)/)[1];
  switch (typeClass) {
    case "uint":
    case "int": {
      let bits = typeName.match(/^u?int([0-9]+)/)[1];
      return {
        typeClass,
        bits: parseInt(bits),
        typeHint
      };
    }
    case "bytes":
      let length = typeName.match(/^bytes([0-9]*)/)[1];
      if (length === "") {
        return {
          typeClass,
          kind: "dynamic",
          typeHint
        };
      } else {
        return {
          typeClass,
          kind: "static",
          length: parseInt(length),
          typeHint
        };
      }
    case "address":
      return {
        typeClass,
        kind: "general",
        typeHint
      };
    case "string":
    case "bool":
      return {
        typeClass,
        typeHint
      };
    case "fixed":
    case "ufixed": {
      let [_, bits, places] = typeName.match(/^u?fixed([0-9]+)x([0-9]+)/);
      return {
        typeClass,
        bits: parseInt(bits),
        places: parseInt(places),
        typeHint
      };
    }
    case "function":
      return {
        typeClass,
        visibility: "external",
        kind: "general",
        typeHint
      };
    case "tuple":
      let memberTypes = abi.components.map(component => ({
        name: component.name || undefined, //leave undefined if component.name is empty string
        type: abiParameterToType(component)
      }));
      return {
        typeClass,
        memberTypes,
        typeHint
      };
  }
}
