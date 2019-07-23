import debugModule from "debug";
const debug = debugModule("codec:decode:value");

import read from "../read";
import * as CodecUtils from "truffle-codec-utils";
import { Types, Values } from "truffle-codec-utils";
import BN from "bn.js";
import utf8 from "utf8";
import { DataPointer } from "../types/pointer";
import { EvmInfo, DecoderOptions } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import { StopDecodingError } from "../types/errors";

export default function* decodeValue(dataType: Types.Type, pointer: DataPointer, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  const { state } = info;
  const { permissivePadding, strictAbiMode: strict } = options; //if these are undefined they'll still be falsy so OK

  let bytes: Uint8Array;
  let rawBytes: Uint8Array;
  try {
    bytes = yield* read(pointer, state);
  }
  catch(error) { //error: Errors.DecodingError
    debug("segfault, pointer %o, state: %O", pointer, state);
    if(strict) {
      throw new StopDecodingError(error.error);
    }
    return {
      type: dataType,
      kind: "error",
      error: error.error
    };
  }
  rawBytes = bytes;

  debug("type %O", dataType);
  debug("pointer %o", pointer);

  switch(dataType.typeClass) {

    case "bool": {
      if(!checkPaddingLeft(bytes, 1)) {
        let error = {
          kind: "BoolPaddingError" as "BoolPaddingError",
          raw: CodecUtils.Conversion.toHexString(bytes)
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error",
          error
        };
      }
      const numeric = CodecUtils.Conversion.toBN(bytes);
      if(numeric.eqn(0)) {
        return {
          type: dataType,
          kind: "value",
          value: { asBool: false }
        };
      }
      else if(numeric.eqn(1)) {
        return {
          type: dataType,
          kind: "value",
          value: { asBool: true }
        };
      }
      else {
        let error = { 
          kind: "BoolOutOfRangeError" as "BoolOutOfRangeError",
          rawAsNumber: numeric.toNumber() //cannot fail, it's only 1 byte
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error",
          error
        };
      }
    }

    case "uint":
      //first, check padding (if needed)
      if(!permissivePadding && !checkPaddingLeft(bytes, dataType.bits/8)) {
        let error = { 
          kind: "UintPaddingError" as "UintPaddingError",
          raw: CodecUtils.Conversion.toHexString(bytes)
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error",
          error
        };
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = bytes.slice(-dataType.bits/8);
      return {
        type: dataType,
        kind: "value",
        value: {
          asBN: CodecUtils.Conversion.toBN(bytes),
          rawAsBN: CodecUtils.Conversion.toBN(rawBytes)
        }
      };
    case "int":
      //first, check padding (if needed)
      if(!permissivePadding && !checkPaddingSigned(bytes, dataType.bits/8)) {
        let error = { 
          kind: "IntPaddingError" as "IntPaddingError",
          raw: CodecUtils.Conversion.toHexString(bytes)
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error",
          error
        };
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = bytes.slice(-dataType.bits/8);
      return {
        type: dataType,
        kind: "value",
        value: {
          asBN: CodecUtils.Conversion.toSignedBN(bytes),
          rawAsBN: CodecUtils.Conversion.toSignedBN(rawBytes)
        }
      };

    case "address":
      if(!permissivePadding && !checkPaddingLeft(bytes, CodecUtils.EVM.ADDRESS_SIZE)) {
        let error = { 
          kind: "AddressPaddingError" as "AddressPaddingError",
          raw: CodecUtils.Conversion.toHexString(bytes)
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error",
          error
        };
      }
      return {
        type: dataType,
        kind: "value",
        value: {
          asAddress: CodecUtils.Conversion.toAddress(bytes),
          rawAsHex: CodecUtils.Conversion.toHexString(rawBytes)
        }
      };

    case "contract":
      if(!permissivePadding && !checkPaddingLeft(bytes, CodecUtils.EVM.ADDRESS_SIZE)) {
        let error = { 
          kind: "ContractPaddingError" as "ContractPaddingError",
          raw: CodecUtils.Conversion.toHexString(bytes)
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error",
          error
        };
      }
      const fullType = <Types.ContractType>Types.fullType(dataType, info.userDefinedTypes);
      const contractValueInfo = <Values.ContractValueInfo> (yield* decodeContract(bytes, info));
      return {
        type: fullType,
        kind: "value",
        value: contractValueInfo
      };

    case "bytes":
      switch(dataType.kind) {
        case "static":
          //first, check padding (if needed)
          if(!permissivePadding && !checkPaddingRight(bytes, dataType.length)) {
            let error = { 
              kind: "BytesPaddingError" as "BytesPaddingError",
              raw: CodecUtils.Conversion.toHexString(bytes)
            };
            if(strict) {
              throw new StopDecodingError(error);
            }
            return {
              type: dataType,
              kind: "error",
              error
            };
          }
          //now, truncate to appropriate length
          bytes = bytes.slice(0, dataType.length);
          return {
            type: dataType,
            kind: "value",
            value: {
              asHex: CodecUtils.Conversion.toHexString(bytes),
              rawAsHex: CodecUtils.Conversion.toHexString(rawBytes)
            }
          };
        case "dynamic":
          //no need to check padding here
          return {
            type: dataType,
            kind: "value",
            value: {
              asHex: CodecUtils.Conversion.toHexString(bytes),
            }
          };
      }

    case "string":
      //there is no padding check for strings
      return {
        type: dataType,
        kind: "value",
        value: decodeString(bytes)
      };

    case "function":
      switch(dataType.visibility) {
        case "external":
          if(!checkPaddingRight(bytes, CodecUtils.EVM.ADDRESS_SIZE + CodecUtils.EVM.SELECTOR_SIZE)) {
            let error = { 
              kind: "FunctionExternalNonStackPaddingError" as "FunctionExternalNonStackPaddingError",
              raw: CodecUtils.Conversion.toHexString(bytes)
            };
            if(strict) {
              throw new StopDecodingError(error);
            }
            return {
              type: dataType,
              kind: "error",
              error
            };
          }
          const address = bytes.slice(0, CodecUtils.EVM.ADDRESS_SIZE);
          const selector = bytes.slice(CodecUtils.EVM.ADDRESS_SIZE, CodecUtils.EVM.ADDRESS_SIZE + CodecUtils.EVM.SELECTOR_SIZE);
          return {
            type: dataType,
            kind: "value",
            value: <Values.FunctionExternalValueInfo> (yield* decodeExternalFunction(address, selector, info))
          };
        case "internal":
          if(strict) {
            //internal functions don't go in the ABI!
            //this should never happen, but just to be sure...
            throw new StopDecodingError(
              { kind: "InternalFunctionInABIError" }
            );
          }
          if(!checkPaddingLeft(bytes, 2 * CodecUtils.EVM.PC_SIZE)) {
            return {
              type: dataType,
              kind: "error",
              error: {
                kind: "FunctionInternalPaddingError",
                raw: CodecUtils.Conversion.toHexString(bytes)
              }
            };
          }
          const deployedPc = bytes.slice(-CodecUtils.EVM.PC_SIZE);
          const constructorPc = bytes.slice(-CodecUtils.EVM.PC_SIZE * 2, -CodecUtils.EVM.PC_SIZE);
          return decodeInternalFunction(dataType, deployedPc, constructorPc, info);
      }
      break; //to satisfy TypeScript

    case "enum": {
      const numeric = CodecUtils.Conversion.toBN(bytes);
      const fullType = <Types.EnumType>Types.fullType(dataType, info.userDefinedTypes);
      if(!fullType.options) {
        let error = {
          kind: "EnumNotFoundDecodingError" as "EnumNotFoundDecodingError",
          type: fullType,
          rawAsBN: numeric
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: fullType,
          kind: "error",
          error
        };
      }
      const numOptions = fullType.options.length;
      const numBytes = Math.ceil(Math.log2(numOptions) / 8);
      if(!checkPaddingLeft(bytes, numBytes)) {
        let error = {
          kind: "EnumPaddingError" as "EnumPaddingError",
          type: fullType,
          raw: CodecUtils.Conversion.toHexString(bytes)
        };
        if(strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: fullType,
          kind: "error",
          error
        };
      }
      if(numeric.ltn(numOptions)) {
        const name = fullType.options[numeric.toNumber()];
        return {
          type: fullType,
          kind: "value",
          value: {
            kind: "valid",
            name,
            numericAsBN: numeric
          }
        };
      }
      else {
        return {
          type: fullType,
          kind: "value",
          value: {
            kind: "invalid",
            numericAsBN: numeric
          }
        };
      }
    }
    //will have to split these once we actually support fixed-point
    case "fixed":
    case "ufixed": {
      //skipping padding check as we don't support this anyway
      const hex = CodecUtils.Conversion.toHexString(bytes);
      let error = {
        kind: "FixedPointNotYetSupportedError" as "FixedPointNotYetSupportedError",
        raw: hex
      };
      if(strict) {
        throw new StopDecodingError(error);
      }
      return {
        type: dataType,
        kind: "error",
        error
      };
    }
  }
}

export function decodeString(bytes: Uint8Array): Values.StringValueInfo {
  //the following line takes our UTF-8 string... and interprets each byte
  //as a UTF-16 bytepair.  Yikes!  Fortunately, we have a library to repair that.
  let badlyEncodedString = String.fromCharCode.apply(undefined, bytes);
  try {
    //this will throw an error if we have malformed UTF-8
    let correctlyEncodedString = utf8.decode(badlyEncodedString);
    //NOTE: we don't use node's builtin Buffer class to do the UTF-8 decoding
    //here, because that handles malformed UTF-8 by means of replacement characters
    //(U+FFFD).  That loses information.  So we use the utf8 package instead,
    //and... well, see the catch block below.
    return {
      kind: "valid",
      asString: correctlyEncodedString
    };
  }
  catch(_) {
    //we're going to ignore the precise error and just assume it's because
    //the string was malformed (what else could it be?)
    let hexString = CodecUtils.Conversion.toHexString(bytes);
    return {
      kind: "malformed",
      asHex: hexString
    };
  }
}

//NOTE that this function returns a ContractValueInfo, not a ContractResult
export function* decodeContract(addressBytes: Uint8Array, info: EvmInfo): IterableIterator<Values.ContractValueInfo | DecoderRequest | Uint8Array> {
  let address = CodecUtils.Conversion.toAddress(addressBytes);
  let rawAddress = CodecUtils.Conversion.toHexString(addressBytes);
  let codeBytes: Uint8Array = yield {
    type: "code",
    address
  };
  let code = CodecUtils.Conversion.toHexString(codeBytes);
  let context = CodecUtils.Contexts.findDecoderContext(info.contexts, code);
  if(context !== null && context.contractName !== undefined) {
    return {
      kind: "known",
      address,
      rawAddress,
      class: CodecUtils.Contexts.contextToType(context)
    };
  }
  else {
    return {
      kind: "unknown",
      address,
      rawAddress
    };
  }
}

//note: address can have extra zeroes on the left like elsewhere, but selector should be exactly 4 bytes
//NOTE this again returns a FunctionExternalValueInfo, not a FunctionExternalResult
export function* decodeExternalFunction(addressBytes: Uint8Array, selectorBytes: Uint8Array, info: EvmInfo): IterableIterator<Values.FunctionExternalValueInfo | DecoderRequest | GeneratorJunk> {
  let contract = <Values.ContractValueInfo> (yield* decodeContract(addressBytes, info));
  let selector = CodecUtils.Conversion.toHexString(selectorBytes);
  if(contract.kind === "unknown") {
    return {
      kind: "unknown",
      contract,
      selector
    };
  }
  let contractId = (<Types.ContractTypeNative> contract.class).id; //sorry! will be fixed soon!
  let context = Object.values(info.contexts).find(
    context => context.contractId.toString() === contractId //similarly! I hope!
  );
  let abiEntry = context.abi !== undefined
    ? context.abi[selector]
    : undefined;
  if(abiEntry === undefined) {
    return {
      kind: "invalid",
      contract,
      selector
    };
  }
  return {
    kind: "known",
    contract,
    selector,
    abi: abiEntry
  };
}

//this one works a bit differently -- in order to handle errors, it *does* return a FunctionInternalResult
export function decodeInternalFunction(dataType: Types.FunctionInternalType, deployedPcBytes: Uint8Array, constructorPcBytes: Uint8Array, info: EvmInfo): Values.FunctionInternalResult {
  let deployedPc: number = CodecUtils.Conversion.toBN(deployedPcBytes).toNumber();
  let constructorPc: number = CodecUtils.Conversion.toBN(constructorPcBytes).toNumber();
  let context: Types.ContractType = CodecUtils.Contexts.contextToType(info.currentContext);
  //before anything else: do we even have an internal functions table?
  //if not, we'll just return the info we have without really attemting to decode
  if(!info.internalFunctionsTable) {
    return {
      type: dataType,
      kind: "value",
      value: {
        kind: "unknown",
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      }
    };
  }
  //also before we continue: is the PC zero? if so let's just return that
  if(deployedPc === 0 && constructorPc === 0) {
    return {
      type: dataType,
      kind: "value",
      value: {
        kind: "exception",
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      }
    };
  }
  //another check: is only the deployed PC zero?
  if(deployedPc === 0 && constructorPc !== 0) {
    return {
      type: dataType,
      kind: "error",
      error: {
        kind: "MalformedInternalFunctionError",
        context,
        deployedProgramCounter: 0,
        constructorProgramCounter: constructorPc
      }
    };
  }
  //one last pre-check: is this a deployed-format pointer in a constructor?
  if(info.currentContext.isConstructor && constructorPc === 0) {
    return {
      type: dataType,
      kind: "error",
      error: {
        kind: "DeployedFunctionInConstructorError",
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: 0
      }
    };
  }
  //otherwise, we get our function
  let pc = info.currentContext.isConstructor
    ? constructorPc
    : deployedPc;
  let functionEntry = info.internalFunctionsTable[pc];
  if(!functionEntry) {
    //if it's not zero and there's no entry... error!
    return {
      type: dataType,
      kind: "error",
      error: {
        kind: "NoSuchInternalFunctionError",
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      }
    };
  }
  if(functionEntry.isDesignatedInvalid) {
    return {
      type: dataType,
      kind: "value",
      value: {
        kind: "exception",
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      }
    };
  }
  let name = functionEntry.name;
  let mutability = functionEntry.mutability;
  let definedIn: Types.ContractType = {
    typeClass: "contract",
    kind: "native",
    id: functionEntry.contractId.toString(),
    typeName: functionEntry.contractName,
    contractKind: functionEntry.contractKind,
    payable: functionEntry.contractPayable
  };
  return {
    type: dataType,
    kind: "value",
    value: {
      kind: "function",
      context,
      deployedProgramCounter: deployedPc,
      constructorProgramCounter: constructorPc,
      name,
      definedIn,
      mutability
    }
  };
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
