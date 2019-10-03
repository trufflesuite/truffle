import debugModule from "debug";
const debug = debugModule("codec:utils:datatype");

import { Types } from "@truffle/codec/format";
import { Common } from "@truffle/codec/types";

export namespace TypeUtils {

  export function isContractDefinedType(anyType: Types.Type): anyType is Types.ContractDefinedType {
    const contractDefinedTypes = ["enum", "struct"];
    return contractDefinedTypes.includes(anyType.typeClass);
  }

  export function isUserDefinedType(anyType: Types.Type): anyType is Types.UserDefinedType {
    const userDefinedTypes = ["contract", "enum", "struct"];
    return userDefinedTypes.includes(anyType.typeClass);
  }

  export function isReferenceType(anyType: Types.Type): anyType is Types.ReferenceType {
    const alwaysReferenceTypes = ["array", "mapping", "struct", "string"];
    if(alwaysReferenceTypes.includes(anyType.typeClass)) {
      return true;
    }
    else if(anyType.typeClass === "bytes") {
      return anyType.kind === "dynamic";
    }
    else {
      return false;
    }
  }

  //one could define a counterpart function that stripped all unnecessary information
  //from the type object, but at the moment I see no need for that
  export function fullType(basicType: Types.Type, userDefinedTypes: Types.TypesById): Types.Type {
    if(!TypeUtils.isUserDefinedType(basicType)) {
      return basicType;
    }
    let id = basicType.id;
    let storedType = userDefinedTypes[id];
    if(!storedType) {
      return basicType;
    }
    let returnType: Types.Type = { ...basicType, ...storedType };
    if(TypeUtils.isReferenceType(basicType) && basicType.location !== undefined) {
      returnType = specifyLocation(returnType, basicType.location);
    }
    return returnType;
  }

  //the location argument here always forces, so passing undefined *will* force undefined
  export function specifyLocation(dataType: Types.Type, location: Common.Location | undefined): Types.Type {
    if(TypeUtils.isReferenceType(dataType)) {
      switch(dataType.typeClass) {
        case "string":
        case "bytes":
          return { ...dataType, location };
        case "array":
          return {
            ...dataType,
            location,
            baseType: specifyLocation(dataType.baseType, location)
          };
        case "mapping":
          let newLocation = location === "storage" ? "storage" as "storage" : undefined;
          return {
            ...dataType,
            location: newLocation,
            valueType: specifyLocation(dataType.valueType, newLocation)
          };
        case "struct":
          let returnType = { ...dataType, location };
          if(returnType.memberTypes) {
            returnType.memberTypes = returnType.memberTypes.map(
              ({name: memberName, type: memberType}) => ({name: memberName, type: specifyLocation(memberType, location)})
            );
          }
          return returnType;
      }
    }
    else {
      return dataType;
    }
  }


  //NOTE: the following two functions might not be exactly right for weird internal stuff,
  //or for ABI-only stuff.  (E.g. for internal stuff sometimes it records whether things
  //are pointers or not??  we don't track that so we can't recreate that)
  //But what can you do.

  export function typeString(dataType: Types.Type): string {
    let baseString = typeStringWithoutLocation(dataType);
    if(isReferenceType(dataType) && dataType.location) {
      return baseString + " " + dataType.location;
    }
    else {
      return baseString;
    }
  }

  export function typeStringWithoutLocation(dataType: Types.Type): string {
    switch(dataType.typeClass) {
      case "uint":
        return dataType.typeHint || `uint${dataType.bits}`;
      case "int":
        return dataType.typeHint || `int${dataType.bits}`;
      case "bool":
        return dataType.typeHint || "bool";
      case "bytes":
        if(dataType.typeHint) {
          return dataType.typeHint;
        }
        switch(dataType.kind) {
          case "dynamic":
            return "bytes";
          case "static":
            return `bytes${dataType.length}`;
          }
      case "address":
        switch(dataType.kind) {
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
        if(dataType.typeHint) {
          return dataType.typeHint;
        }
        switch(dataType.kind) {
          case "dynamic":
            return `${typeStringWithoutLocation(dataType.baseType)}[]`;
          case "static":
            return `${typeStringWithoutLocation(dataType.baseType)}[${dataType.length}]`;
        }
      case "mapping":
        return `mapping(${typeStringWithoutLocation(dataType.keyType)} => ${typeStringWithoutLocation(dataType.valueType)})`;
      case "struct":
      case "enum":
        //combining these cases for simplicity
        switch(dataType.kind) {
          case "local":
            return `${dataType.typeClass} ${dataType.definingContractName}.${dataType.typeName}`;
          case "global": //WARNING, SPECULATIVE
            return `${dataType.typeClass} ${dataType.typeName}`;
        }
      case "tuple":
        return dataType.typeHint || "tuple(" + dataType.memberTypes.map(memberType => typeString(memberType.type)).join(",") + ")"; //note that we do include location and do not put spaces
      case "contract":
        return dataType.contractKind + " " + dataType.typeName;
      case "magic":
        //no, this is not transposed!
        const variableNames = {message: "msg", transaction: "tx", block: "block"};
        return variableNames[dataType.variable];
      case "function":
        let visibilityString: string;
        switch(dataType.visibility) {
          case "external":
            if(dataType.kind === "general") {
              if(dataType.typeHint) {
                return dataType.typeHint;
              }
              else {
                return "function external"; //I guess???
              }
            }
            visibilityString = " external"; //note the deliberate space!
            break;
          case "internal":
            visibilityString = "";
            break;
        }
        let mutabilityString = dataType.mutability === "nonpayable" ? " " + dataType.mutability : ""; //again, note the deliberate space
        let inputList = dataType.inputParameterTypes.map(typeString).join(","); //note that we do include location, and do not put spaces
        let outputList = dataType.outputParameterTypes.map(typeString).join(",");
        let inputString = `function(${inputList})`;
        let outputString = outputList === "" ? "" : ` returns (${outputList})`; //again, note the deliberate space
        return inputString + mutabilityString + visibilityString + outputString;
    }
  }

}
