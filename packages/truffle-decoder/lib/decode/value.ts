import debugModule from "debug";
const debug = debugModule("decoder:decode:value");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import BN from "bn.js";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeValue(dataType: Types.Type, pointer: DataPointer, info: EvmInfo): IterableIterator<Values.Value | DecoderRequest | GeneratorJunk> {
  //NOTE: this does not actually return a Uint8Aarray, but due to the use of yield* read,
  //we have to include it in the type :-/
  const { state } = info;

  let bytes: Uint8Array;
  try {
    bytes = yield* read(pointer, state);
  }
  catch(error) { //error: Values.DecodingError
    debug("segfault, pointer %o, state: %O", pointer, state);
    return new Values.GenericError(error.error);
  }

  debug("type %O", dataType);
  debug("pointer %o", pointer);

  switch(dataType.typeClass) {

    case "bool": {
      const numeric = DecodeUtils.Conversion.toBN(bytes);
      if(numeric.eqn(0)) {
        return new Values.BoolValueProper(dataType, false);
      }
      else if(numeric.eqn(1)) {
        return new Values.BoolValueProper(dataType, true);
      }
      else {
        return new Values.BoolValueError(dataType,
          new Values.BoolOutOfRangeError(numeric)
        );
      }
    }

    case "uint":
      return new Values.UintValueProper(dataType, DecodeUtils.Conversion.toBN(bytes));
    case "int":
      return new Values.IntValueProper(dataType, DecodeUtils.Conversion.toSignedBN(bytes));

    case "address":
      return new Values.AddressValueProper(dataType, DecodeUtils.Conversion.toAddress(bytes));

    case "contract":
      const fullType = <Types.ContractType>Types.fullType(dataType, info.userDefinedTypes);
      const contractValueDirect = <Values.ContractValueDirect> (yield* decodeContract(bytes, info));
      return new Values.ContractValueProper(fullType, contractValueDirect);

    case "bytes":
      if(dataType.kind === "static") {
        //if there's a static size, we want to truncate to that length
        bytes = bytes.slice(0, dataType.length);
      }
      //we don't need to pass in length to the conversion, since that's for *adding* padding
      return new Values.BytesValueProper(dataType, DecodeUtils.Conversion.toHexString(bytes));
    case "string":
      return new Values.StringValueProper(dataType, String.fromCharCode.apply(undefined, bytes));

    case "function":
      switch(dataType.visibility) {
        case "external":
          const address = bytes.slice(0, DecodeUtils.EVM.ADDRESS_SIZE);
          const selector = bytes.slice(DecodeUtils.EVM.ADDRESS_SIZE, DecodeUtils.EVM.ADDRESS_SIZE + DecodeUtils.EVM.SELECTOR_SIZE);
          return yield* decodeExternalFunction(dataType, address, selector, info);
        case "internal":
          const deployedPc = bytes.slice(-DecodeUtils.EVM.PC_SIZE);
          const constructorPc = bytes.slice(-DecodeUtils.EVM.PC_SIZE * 2, -DecodeUtils.EVM.PC_SIZE);
          return decodeInternalFunction(dataType, deployedPc, constructorPc, info);
      }

    case "enum": {
      const numeric = DecodeUtils.Conversion.toBN(bytes);
      const fullType = <Types.EnumType>Types.fullType(dataType, info.userDefinedTypes);
      if(!fullType.options) {
        return new Values.EnumValueError(fullType,
          new Values.EnumNotFoundDecodingError(fullType, numeric)
        );
      }
      if(numeric.ltn(fullType.options.length)) {
        const name = fullType.options[numeric.toNumber()];
        return new Values.EnumValueProper(fullType, numeric, name);
      }
      else {
        return new Values.EnumValueError(fullType,
          new Values.EnumOutOfRangeError(fullType, numeric)
        );
      }
    }

    case "fixed": {
      const hex = DecodeUtils.Conversion.toHexString(bytes);
      return new Values.FixedValueError(dataType, hex);
    }
    case "ufixed": {
      const hex = DecodeUtils.Conversion.toHexString(bytes);
      return new Values.UfixedValueError(dataType, hex);
    }
  }
}

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
export function* decodeExternalFunction(dataType: Types.FunctionType, addressBytes: Uint8Array, selectorBytes: Uint8Array, info: EvmInfo): IterableIterator<Values.FunctionValueExternal | DecoderRequest | GeneratorJunk> {
  let contract = <Values.ContractValueDirect> (yield* decodeContract(addressBytes, info));
  let selector = DecodeUtils.Conversion.toHexString(selectorBytes);
  if(contract.kind === "unknown") {
    return new Values.FunctionValueExternalProperUnknown(dataType, contract, selector);
  }
  let contractId = contract.class.id;
  let context = Object.values(info.contexts).find(
    context => context.contractId === contractId
  );
  let abiEntry = context.abi !== undefined
    ? context.abi[selector]
    : undefined;
  if(abiEntry === undefined) {
    return new Values.FunctionValueExternalProperInvalid(dataType, contract, selector);
  }
  let functionName = abiEntry.name;
  return new Values.FunctionValueExternalProperKnown(dataType, contract, selector, functionName);
}

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
    return new Values.FunctionValueInternalProperUnknown(dataType, context, deployedPc, constructorPc);
  }
  //also before we continue: is the PC zero? if so let's just return that
  if(deployedPc === 0 && constructorPc === 0) {
    return new Values.FunctionValueInternalProperException(dataType, context, deployedPc, constructorPc);
  }
  //another check: is only the deployed PC zero?
  if(deployedPc === 0 && constructorPc !== 0) {
    return new Values.FunctionValueInternalError(dataType,
      new Values.MalformedInternalFunctionError(context, constructorPc)
    );
  }
  //one last pre-check: is this a deployed-format pointer in a constructor?
  if(info.currentContext.isConstructor && constructorPc === 0) {
    return new Values.FunctionValueInternalError(dataType,
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
    return new Values.FunctionValueInternalError(dataType,
      new Values.NoSuchInternalFunctionError(context, deployedPc, constructorPc)
    );
  }
  if(functionEntry.isDesignatedInvalid) {
    return new Values.FunctionValueInternalProperException(dataType, context, deployedPc, constructorPc);
  }
  let name = functionEntry.name;
  let definedIn: Types.ContractType = {
    typeClass: "contract",
    id: functionEntry.contractId,
    typeName: functionEntry.contractName,
    contractKind: functionEntry.contractKind,
    payable: functionEntry.contractPayable
  };
  return new Values.FunctionValueInternalProperKnown(dataType, context, deployedPc, constructorPc, name, definedIn);
}
