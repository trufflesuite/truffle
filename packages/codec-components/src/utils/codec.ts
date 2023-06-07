/* eslint-disable */

/**
 * Utility functions from packages/codec/lib/format/types.ts
 * Copied here because failed to import. Don't maintain.
 */

import type { Format } from "@truffle/codec";

export function isReferenceType(
  anyType: Format.Types.Type
): anyType is Format.Types.ReferenceType {
  const alwaysReferenceTypes = ["array", "mapping", "struct", "string"];
  if (alwaysReferenceTypes.includes(anyType.typeClass)) {
    return true;
  } else if (anyType.typeClass === "bytes") {
    return anyType.kind === "dynamic";
  } else {
    return false;
  }
}

export function typeString(dataType: Format.Types.Type): string {
  let baseString = typeStringWithoutLocation(dataType);
  if (isReferenceType(dataType) && dataType.location) {
    return baseString + " " + dataType.location;
  } else {
    return baseString;
  }
}

export function typeStringWithoutLocation(dataType: Format.Types.Type): string {
  switch (dataType.typeClass) {
    case "uint":
      return dataType.typeHint || `uint${dataType.bits}`;
    case "int":
      return dataType.typeHint || `int${dataType.bits}`;
    case "bool":
      return dataType.typeHint || "bool";
    case "bytes":
      if (dataType.typeHint) {
        return dataType.typeHint;
      }
      switch (dataType.kind) {
        case "dynamic":
          return "bytes";
        case "static":
          return `bytes${dataType.length}`;
      }
    case "address":
      switch (dataType.kind) {
        case "general":
          return dataType.typeHint || "address"; //I guess?
        case "specific":
          return dataType.payable ? "address payable" : "address";
      }
    case "string":
      return dataType.typeHint || "string";
    case "fixed":
      return dataType.typeHint || `fixed${dataType.bits}x${dataType.places}`;
    case "ufixed":
      return dataType.typeHint || `ufixed${dataType.bits}x${dataType.places}`;
    case "array":
      if (dataType.typeHint) {
        return dataType.typeHint;
      }
      switch (dataType.kind) {
        case "dynamic":
          return `${typeStringWithoutLocation(dataType.baseType)}[]`;
        case "static":
          return `${typeStringWithoutLocation(dataType.baseType)}[${
            dataType.length
          }]`;
      }
    case "mapping":
      return `mapping(${typeStringWithoutLocation(
        dataType.keyType
      )} => ${typeStringWithoutLocation(dataType.valueType)})`;
    case "struct":
    case "enum":
      //combining these cases for simplicity
      switch (dataType.kind) {
        case "local":
          return `${dataType.typeClass} ${dataType.definingContractName}.${dataType.typeName}`;
        case "global":
          return `${dataType.typeClass} ${dataType.typeName}`;
      }
      break; //to satisfy TS :P
    case "userDefinedValueType":
      //differs from struct & enum in that typeClass is omitted
      switch (dataType.kind) {
        case "local":
          return `${dataType.definingContractName}.${dataType.typeName}`;
        case "global":
          return `${dataType.typeName}`;
      }
      break; //to satisfy TS :P
    case "tuple":
      return (
        dataType.typeHint ||
        "tuple(" +
          dataType.memberTypes
            .map(memberType => typeString(memberType.type))
            .join(",") +
          ")"
      ); //note that we do include location and do not put spaces
    case "contract":
      return dataType.contractKind + " " + dataType.typeName;
    case "magic":
      //no, this is not transposed!
      const variableNames = {
        message: "msg",
        transaction: "tx",
        block: "block"
      };
      return variableNames[dataType.variable];
    case "type":
      return `type(${typeString(dataType.type)})`;
    case "function":
      let visibilityString: string;
      switch (dataType.visibility) {
        case "external":
          if (dataType.kind === "general") {
            if (dataType.typeHint) {
              return dataType.typeHint;
            } else {
              return "function external"; //I guess???
            }
          }
          visibilityString = " external"; //note the deliberate space!
          break;
        case "internal":
          visibilityString = "";
          break;
      }
      let mutabilityString =
        dataType.mutability === "nonpayable" ? "" : " " + dataType.mutability; //again, note the deliberate space
      let inputList = dataType.inputParameterTypes.map(typeString).join(","); //note that we do include location, and do not put spaces
      let outputList = dataType.outputParameterTypes.map(typeString).join(",");
      let inputString = `function(${inputList})`;
      let outputString = outputList === "" ? "" : ` returns (${outputList})`; //again, note the deliberate space
      return inputString + mutabilityString + visibilityString + outputString;
    case "options":
      //note: not a real Solidity type! just for error messaging!
      return "options";
  }
}
