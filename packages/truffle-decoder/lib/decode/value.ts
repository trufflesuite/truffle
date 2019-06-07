import debugModule from "debug";
const debug = debugModule("decoder:decode:value");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import BN from "bn.js";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeValue(dataType: Types.Type, pointer: DataPointer, info: EvmInfo, permissivePadding: boolean = false): IterableIterator<Values.Value | DecoderRequest | GeneratorJunk> {
  //NOTE: this does not actually return a Uint8Aarray, but due to the use of yield* read,
  //we have to include it in the type :-/
  const { state } = info;

  let bytes: Uint8Array;
  try {
    bytes = yield* read(pointer, state);
  }
  catch(error) { //error: Values.DecodingError
    debug("segfault, pointer %o, state: %O", pointer, state);
    return Values.makeGenericValueError(dataType, error.error);
  }

  debug("type %O", dataType);
  debug("pointer %o", pointer);

  switch(dataType.typeClass) {

    case "bool": {
      if(!checkPaddingLeft(bytes, 1)) {
        return new Values.BoolValueError(
          dataType,
          new Values.BoolPaddingError(DecodeUtils.Conversion.toHexString(bytes))
        );
      }
      const numeric = DecodeUtils.Conversion.toBN(bytes);
      if(numeric.eqn(0)) {
        return new Values.BoolValueProper(dataType, false);
      }
      else if(numeric.eqn(1)) {
        return new Values.BoolValueProper(dataType, true);
      }
      else {
        return new Values.BoolValueError(
          dataType,
          new Values.BoolOutOfRangeError(numeric)
        );
      }
    }

    case "uint":
      //first, check padding (if needed)
      if(!permissivePadding && !checkPaddingLeft(bytes, dataType.bits/8)) {
        return new Values.UintValueError(
          dataType,
          new Values.UintPaddingError(DecodeUtils.Conversion.toHexString(bytes))
        );
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = bytes.slice(-dataType.bits/8);
      return new Values.UintValueProper(dataType, DecodeUtils.Conversion.toBN(bytes));
    case "int":
      //first, check padding (if needed)
      if(!permissivePadding && !checkPaddingSigned(bytes, dataType.bits/8)) {
        return new Values.IntValueError(
          dataType,
          new Values.IntPaddingError(DecodeUtils.Conversion.toHexString(bytes))
        );
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = bytes.slice(-dataType.bits/8);
      return new Values.IntValueProper(dataType, DecodeUtils.Conversion.toSignedBN(bytes));

    case "address":
      if(!checkPaddingLeft(bytes, DecodeUtils.EVM.ADDRESS_SIZE)) {
        return new Values.AddressValueError(
          dataType,
          new Values.AddressPaddingError(DecodeUtils.Conversion.toHexString(bytes))
        );
      }
      return new Values.AddressValueProper(dataType, DecodeUtils.Conversion.toAddress(bytes));

    case "contract":
      if(!checkPaddingLeft(bytes, DecodeUtils.EVM.ADDRESS_SIZE)) {
        return new Values.ContractValueError(
          dataType,
          new Values.ContractPaddingError(DecodeUtils.Conversion.toHexString(bytes))
        );
      }
      const fullType = <Types.ContractType>Types.fullType(dataType, info.userDefinedTypes);
      const contractValueDirect = <Values.ContractValueDirect> (yield* decodeContract(bytes, info));
      return new Values.ContractValueProper(fullType, contractValueDirect);

    case "bytes":
      if(dataType.kind === "static") {
        //first, check padding (if needed)
        if(!permissivePadding && !checkPaddingRight(bytes, dataType.length)) {
          return new Values.BytesValueError(
            dataType,
            new Values.BytesPaddingError(DecodeUtils.Conversion.toHexString(bytes))
          );
        }
        //now, truncate to appropriate length
        bytes = bytes.slice(0, dataType.length);
      }
      //we don't need to pass in length to the conversion, since that's for *adding* padding
      //(there is also no padding check for dynamic bytes)
      return new Values.BytesValueProper(dataType, DecodeUtils.Conversion.toHexString(bytes));

    case "string":
      //there is no padding check for strings
      return new Values.StringValueProper(dataType, String.fromCharCode.apply(undefined, bytes));

    case "function":
      switch(dataType.visibility) {
        case "external":
          if(!checkPaddingRight(bytes, DecodeUtils.EVM.ADDRESS_SIZE + DecodeUtils.EVM.SELECTOR_SIZE)) {
            return new Values.FunctionValueExternalError(
              dataType,
              new Values.FunctionExternalNonStackPaddingError(DecodeUtils.Conversion.toHexString(bytes))
            );
          }
          const address = bytes.slice(0, DecodeUtils.EVM.ADDRESS_SIZE);
          const selector = bytes.slice(DecodeUtils.EVM.ADDRESS_SIZE, DecodeUtils.EVM.ADDRESS_SIZE + DecodeUtils.EVM.SELECTOR_SIZE);
          return new Values.FunctionValueExternalProper(dataType,
            <Values.FunctionValueExternalDirect> (yield* decodeExternalFunction(address, selector, info))
          );
        case "internal":
          if(!checkPaddingLeft(bytes, 2 * DecodeUtils.EVM.PC_SIZE)) {
            return new Values.FunctionValueInternalError(
              dataType,
              new Values.FunctionInternalPaddingError(DecodeUtils.Conversion.toHexString(bytes))
            );
          }
          const deployedPc = bytes.slice(-DecodeUtils.EVM.PC_SIZE);
          const constructorPc = bytes.slice(-DecodeUtils.EVM.PC_SIZE * 2, -DecodeUtils.EVM.PC_SIZE);
          return decodeInternalFunction(dataType, deployedPc, constructorPc, info);
      }
      break; //to satisfy TypeScript

    case "enum": {
      const numeric = DecodeUtils.Conversion.toBN(bytes);
      const fullType = <Types.EnumType>Types.fullType(dataType, info.userDefinedTypes);
      if(!fullType.options) {
        return new Values.EnumValueError(
          fullType,
          new Values.EnumNotFoundDecodingError(fullType, numeric)
        );
      }
      const numOptions = fullType.options.length;
      const numBytes = Math.ceil(Math.log2(numOptions) / 8);
      if(!checkPaddingLeft(bytes, numBytes)) {
        return new Values.EnumValueError(
          fullType,
          new Values.EnumPaddingError(fullType, DecodeUtils.Conversion.toHexString(bytes))
        );
      }
      if(numeric.ltn(numOptions)) {
        const name = fullType.options[numeric.toNumber()];
        return new Values.EnumValueProper(fullType, numeric, name);
      }
      else {
        return new Values.EnumValueError(
          fullType,
          new Values.EnumOutOfRangeError(fullType, numeric)
        );
      }
    }

    case "fixed": {
      //skipping padding check as we don't support this anyway
      const hex = DecodeUtils.Conversion.toHexString(bytes);
      return new Values.FixedValueError(
        dataType,
        new Values.FixedPointNotYetSupportedError(hex)
      );
    }
    case "ufixed": {
      //skipping padding check as we don't support this anyway
      const hex = DecodeUtils.Conversion.toHexString(bytes);
      return new Values.UfixedValueError(
        dataType,
        new Values.FixedPointNotYetSupportedError(hex)
      );
    }
  }
}

//NOTE that this function returns a ContractValueDirect, not a ContractValue
export function* decodeContract(addressBytes: Uint8Array, info: EvmInfo): IterableIterator<Values.ContractValueDirect | DecoderRequest | Uint8Array> {
  let address = DecodeUtils.Conversion.toAddress(addressBytes);
  let codeBytes: Uint8Array = yield {
    type: "code",
    address
  };
  let code = DecodeUtils.Conversion.toHexString(codeBytes);
  let context = DecodeUtils.Contexts.findDecoderContext(info.contexts, code);
  if(context !== null && context.contractName !== undefined) {
    return new Values.ContractValueDirectKnown(address, {
      typeClass: "contract",
      id: context.contractId,
      typeName: context.contractName,
      contractKind: context.contractKind,
      payable: context.payable
    });
  }
  else {
    return new Values.ContractValueDirectUnknown(address);
  }
}

//note: address can have extra zeroes on the left like elsewhere, but selector should be exactly 4 bytes
//NOTE this again returns a FunctionValueExternalDirect, not a FunctionValueExternal
export function* decodeExternalFunction(addressBytes: Uint8Array, selectorBytes: Uint8Array, info: EvmInfo): IterableIterator<Values.FunctionValueExternalDirect | DecoderRequest | GeneratorJunk> {
  let contract = <Values.ContractValueDirect> (yield* decodeContract(addressBytes, info));
  let selector = DecodeUtils.Conversion.toHexString(selectorBytes);
  if(contract.kind === "unknown") {
    return new Values.FunctionValueExternalDirectUnknown(contract, selector)
  }
  let contractId = contract.class.id;
  let context = Object.values(info.contexts).find(
    context => context.contractId === contractId
  );
  let abiEntry = context.abi !== undefined
    ? context.abi[selector]
    : undefined;
  if(abiEntry === undefined) {
    return new Values.FunctionValueExternalDirectInvalid(contract, selector)
  }
  let functionName = abiEntry.name;
  return new Values.FunctionValueExternalDirectKnown(contract, selector, functionName)
}

//this one works a bit differently -- in order to handle errors, it *does* return a FunctionValueInternal
export function decodeInternalFunction(dataType: Types.FunctionType, deployedPcBytes: Uint8Array, constructorPcBytes: Uint8Array, info: EvmInfo): Values.FunctionValueInternal {
  let deployedPc: number = DecodeUtils.Conversion.toBN(deployedPcBytes).toNumber();
  let constructorPc: number = DecodeUtils.Conversion.toBN(constructorPcBytes).toNumber();
  let context: Types.ContractType = {
    typeClass: "contract",
    id: info.currentContext.contractId,
    typeName: info.currentContext.contractName,
    contractKind: info.currentContext.contractKind,
    payable: info.currentContext.payable
  };
  //before anything else: do we even have an internal functions table?
  //if not, we'll just return the info we have without really attemting to decode
  if(!info.internalFunctionsTable) {
    return new Values.FunctionValueInternalProper(
      dataType,
      new Values.FunctionValueInternalDirectUnknown(context, deployedPc, constructorPc)
    );
  }
  //also before we continue: is the PC zero? if so let's just return that
  if(deployedPc === 0 && constructorPc === 0) {
    return new Values.FunctionValueInternalProper(
      dataType,
      new Values.FunctionValueInternalDirectException(context, deployedPc, constructorPc)
    );
  }
  //another check: is only the deployed PC zero?
  if(deployedPc === 0 && constructorPc !== 0) {
    return new Values.FunctionValueInternalError(
      dataType,
      new Values.MalformedInternalFunctionError(context, constructorPc)
    );
  }
  //one last pre-check: is this a deployed-format pointer in a constructor?
  if(info.currentContext.isConstructor && constructorPc === 0) {
    return new Values.FunctionValueInternalError(
      dataType,
      new Values.DeployedFunctionInConstructorError(context, deployedPc)
    );
  }
  //otherwise, we get our function
  let pc = info.currentContext.isConstructor
    ? constructorPc
    : deployedPc;
  let functionEntry = info.internalFunctionsTable[pc];
  if(!functionEntry) {
    //if it's not zero and there's no entry... error!
    return new Values.FunctionValueInternalError(
      dataType,
      new Values.NoSuchInternalFunctionError(context, deployedPc, constructorPc)
    );
  }
  if(functionEntry.isDesignatedInvalid) {
    return new Values.FunctionValueInternalProper(
      dataType,
      new Values.FunctionValueInternalDirectException(context, deployedPc, constructorPc)
    );
  }
  let name = functionEntry.name;
  let definedIn: Types.ContractType = {
    typeClass: "contract",
    id: functionEntry.contractId,
    typeName: functionEntry.contractName,
    contractKind: functionEntry.contractKind,
    payable: functionEntry.contractPayable
  };
  return new Values.FunctionValueInternalProper(
    dataType,
    new Values.FunctionValueInternalDirectKnown(context, deployedPc, constructorPc, name, definedIn)
  );
}

function checkPaddingRight(bytes: Uint8Array, length: number): boolean {
  let padding = bytes.slice(length); //cut off the first length bytes
  return padding.every(paddingByte => paddingByte === 0);
}

//exporting this one for use in stack.ts
export function checkPaddingLeft(bytes: Uint8Array, length: number): boolean {
  let padding = bytes.slice(0, -length); //cut off the last length bytes
  return padding.every(paddingByte => paddingByte === 0);
}

function checkPaddingSigned(bytes: Uint8Array, length: number): boolean {
  let padding = bytes.slice(0, -length); //padding is all but the last length bytes
  let value = bytes.slice(-length); //meanwhile the actual value is those last length bytes
  let signByte = value[0] & 0x80 ? 0xff : 0x00;
  return padding.every(paddingByte => paddingByte === signByte);
}
