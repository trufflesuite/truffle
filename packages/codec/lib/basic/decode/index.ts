import debugModule from "debug";
const debug = debugModule("codec:basic:decode");

import read from "@truffle/codec/read";
import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import * as Contexts from "@truffle/codec/contexts";
import type * as Pointer from "@truffle/codec/pointer";
import type { DecoderRequest, DecoderOptions } from "@truffle/codec/types";
import type { PaddingMode, PaddingType } from "@truffle/codec/common";
import * as Evm from "@truffle/codec/evm";
import { handleDecodingError, StopDecodingError } from "@truffle/codec/errors";
import { byteLength } from "@truffle/codec/basic/allocate";

export function* decodeBasic(
  dataType: Format.Types.Type,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array | null> {
  const { state } = info;
  const { strictAbiMode: strict } = options; //if this is undefined it'll still be falsy so it's OK
  const paddingMode: PaddingMode = options.paddingMode || "default";

  let bytes: Uint8Array;
  let rawBytes: Uint8Array;
  try {
    bytes = yield* read(pointer, state);
  } catch (error) {
    debug("segfault, pointer %o, state: %O", pointer, state);
    return handleDecodingError(dataType, error, strict);
  }
  rawBytes = bytes;

  debug("type %O", dataType);
  debug("pointer %o", pointer);

  switch (dataType.typeClass) {
    case "userDefinedValueType": {
      const fullType = <Format.Types.UserDefinedValueTypeType>(
        Format.Types.fullType(dataType, info.userDefinedTypes)
      );
      if (!fullType.underlyingType) {
        const error = {
          kind: "UserDefinedTypeNotFoundError" as const,
          type: fullType
        };
        if (strict || options.allowRetry) {
          throw new StopDecodingError(error, true);
          //note that we allow a retry if we couldn't locate the underlying type!
        }
        return {
          type: fullType,
          kind: "error" as const,
          error
        };
      }
      const underlyingResult = yield* decodeBasic(
        fullType.underlyingType,
        pointer,
        info,
        options
      );
      switch (
        underlyingResult.kind //yes this switch is a little unnecessary :P
      ) {
        case "value":
          //wrap the value and return
          return <Format.Values.UserDefinedValueTypeValue>{
            //no idea why need coercion here
            type: fullType,
            kind: "value" as const,
            value: underlyingResult,
            interpretations: {}
          };
        case "error":
          //wrap the error and return an error result!
          //this is inconsistent with how we handle other container types
          //(structs, arrays, mappings), where having an error in one element
          //does not cause an error in the whole thing, but to do that here
          //would cause problems for the type system :-/
          //so we'll just be inconsistent
          return <Format.Errors.UserDefinedValueTypeErrorResult>{
            //TS is being bad again :-/
            type: fullType,
            kind: "error" as const,
            error: {
              kind: "WrappedError",
              error: underlyingResult
            }
          };
      }
      break; //to satisfy TS :P
    }
    case "bool": {
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "BoolPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      bytes = removePadding(bytes, dataType, paddingMode);
      //note: the use of the BN is a little silly here,
      //but, kind of stuck with it for now
      const numeric = Conversion.toBN(bytes);
      if (numeric.eqn(0)) {
        return {
          type: dataType,
          kind: "value" as const,
          value: { asBoolean: false },
          interpretations: {}
        };
      } else if (numeric.eqn(1)) {
        return {
          type: dataType,
          kind: "value" as const,
          value: { asBoolean: true },
          interpretations: {}
        };
      } else {
        let error = {
          kind: "BoolOutOfRangeError" as const,
          rawAsBN: numeric
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
    }

    case "uint":
      //first, check padding (if needed)
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "UintPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      //now, truncate to appropriate length
      bytes = removePadding(bytes, dataType, paddingMode);
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asBN: Conversion.toBN(bytes),
          rawAsBN: Conversion.toBN(rawBytes)
        },
        interpretations: {}
      };
    case "int":
      //first, check padding (if needed)
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "IntPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = removePadding(bytes, dataType, paddingMode);
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asBN: Conversion.toSignedBN(bytes),
          rawAsBN: Conversion.toSignedBN(rawBytes)
        },
        interpretations: {}
      };

    case "address":
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "AddressPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      bytes = removePadding(bytes, dataType, paddingMode);
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asAddress: Evm.Utils.toAddress(bytes),
          rawAsHex: Conversion.toHexString(rawBytes)
        },
        interpretations: {}
      };

    case "contract":
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "ContractPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      bytes = removePadding(bytes, dataType, paddingMode);
      const fullType = <Format.Types.ContractType>(
        Format.Types.fullType(dataType, info.userDefinedTypes)
      );
      const contractValueInfo = yield* decodeContract(bytes, info);
      return {
        type: fullType,
        kind: "value" as const,
        value: contractValueInfo,
        interpretations: {}
      };

    case "bytes":
      //NOTE: we assume this is a *static* bytestring,
      //because this is decodeBasic! dynamic ones should
      //go to decodeBytes!
      let coercedDataType = <Format.Types.BytesTypeStatic>dataType;

      //first, check padding (if needed)
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "BytesPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: coercedDataType,
          kind: "error" as const,
          error
        };
      }
      //now, truncate to appropriate length
      bytes = removePadding(bytes, dataType, paddingMode);
      return {
        type: coercedDataType,
        kind: "value" as const,
        value: {
          asHex: Conversion.toHexString(bytes),
          rawAsHex: Conversion.toHexString(rawBytes)
        },
        interpretations: {}
      };

    case "function":
      switch (dataType.visibility) {
        case "external":
          if (!checkPadding(bytes, dataType, paddingMode)) {
            const error = {
              kind: "FunctionExternalNonStackPaddingError" as const,
              paddingType: getPaddingType(dataType, paddingMode),
              raw: Conversion.toHexString(bytes)
            };
            if (strict) {
              throw new StopDecodingError(error);
            }
            return {
              type: dataType,
              kind: "error" as const,
              error
            };
          }
          bytes = removePadding(bytes, dataType, paddingMode);
          const address = bytes.slice(0, Evm.Utils.ADDRESS_SIZE);
          const selector = bytes.slice(
            Evm.Utils.ADDRESS_SIZE,
            Evm.Utils.ADDRESS_SIZE + Evm.Utils.SELECTOR_SIZE
          );
          return {
            type: dataType,
            kind: "value" as const,
            value: yield* decodeExternalFunction(address, selector, info),
            interpretations: {}
          };
        case "internal":
          //note: we used to error if we hit this point with strict === true,
          //since internal function pointers don't go in the ABI, and strict
          //mode is intended for ABI decoding.  however, there are times when
          //we want to use strict mode to decode immutables, and immutables can
          //include internal function pointers.  so now we allow this.  yes,
          //this is a bit of an abuse of strict mode, which was after all meant
          //for ABI decoding, but oh well.
          if (!checkPadding(bytes, dataType, paddingMode)) {
            const error = {
              kind: "FunctionInternalPaddingError" as const,
              paddingType: getPaddingType(dataType, paddingMode),
              raw: Conversion.toHexString(bytes)
            };
            if (strict) {
              throw new StopDecodingError(error);
            }
            return {
              type: dataType,
              kind: "error" as const,
              error
            };
          }
          bytes = removePadding(bytes, dataType, paddingMode);
          const deployedPc = bytes.slice(-Evm.Utils.PC_SIZE);
          const constructorPc = bytes.slice(
            -Evm.Utils.PC_SIZE * 2,
            -Evm.Utils.PC_SIZE
          );
          return decodeInternalFunction(
            dataType,
            deployedPc,
            constructorPc,
            info,
            strict
          );
      }
      break; //to satisfy TypeScript

    case "enum": {
      let numeric = Conversion.toBN(bytes);
      const fullType = <Format.Types.EnumType>(
        Format.Types.fullType(dataType, info.userDefinedTypes)
      );
      if (!fullType.options) {
        let error = {
          kind: "EnumNotFoundDecodingError" as const,
          type: fullType,
          rawAsBN: numeric
        };
        if (strict || options.allowRetry) {
          throw new StopDecodingError(error, true);
          //note that we allow a retry if we couldn't locate the enum type!
        }
        return {
          type: fullType,
          kind: "error" as const,
          error
        };
      }
      //note: I'm doing the padding checks a little more manually on this one
      //so that we can have the right type of error
      const numOptions = fullType.options.length;
      const numBytes = Math.ceil(Math.log2(numOptions) / 8);
      const paddingType = getPaddingType(dataType, paddingMode);
      if (!checkPaddingDirect(bytes, numBytes, paddingType)) {
        let error = {
          kind: "EnumPaddingError" as const,
          type: fullType,
          paddingType,
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      bytes = removePaddingDirect(bytes, numBytes, paddingType);
      numeric = Conversion.toBN(bytes); //alter numeric!
      if (numeric.ltn(numOptions)) {
        const name = fullType.options[numeric.toNumber()];
        //NOTE: despite the use of toNumber(), I'm NOT catching exceptions here and returning an
        //error value like elsewhere; I'm just letting this one fail.  Why?  Because if we have
        //an enum with that many options in the first place, we have bigger problems!
        return {
          type: fullType,
          kind: "value" as const,
          value: {
            name,
            numericAsBN: numeric
          },
          interpretations: {}
        };
      } else {
        let error = {
          kind: "EnumOutOfRangeError" as const,
          type: fullType,
          rawAsBN: numeric
        };
        if (strict) {
          //note:
          //if the enum is merely out of range rather than out of the ABI range,
          //we do NOT throw an error here!  instead we simply return an error value,
          //which we normally avoid doing in strict mode.  (the error will be caught
          //later at the re-encoding step instead.)  why?  because we might be running
          //in ABI mode, so we may need to abify this "value" rather than just throwing
          //it out.
          throw new StopDecodingError(error);
          //note that we do NOT allow a retry here!
          //if we *can* find the enum type but the value is out of range,
          //we *know* that it is invalid!
        }
        return {
          type: fullType,
          kind: "error" as const,
          error
        };
      }
    }

    case "fixed": {
      //first, check padding (if needed)
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "FixedPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = removePadding(bytes, dataType, paddingMode);
      let asBN = Conversion.toSignedBN(bytes);
      let rawAsBN = Conversion.toSignedBN(rawBytes);
      let asBig = Conversion.shiftBigDown(
        Conversion.toBig(asBN),
        dataType.places
      );
      let rawAsBig = Conversion.shiftBigDown(
        Conversion.toBig(rawAsBN),
        dataType.places
      );
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asBig,
          rawAsBig
        },
        interpretations: {}
      };
    }
    case "ufixed": {
      //first, check padding (if needed)
      if (!checkPadding(bytes, dataType, paddingMode)) {
        let error = {
          kind: "UfixedPaddingError" as const,
          paddingType: getPaddingType(dataType, paddingMode),
          raw: Conversion.toHexString(bytes)
        };
        if (strict) {
          throw new StopDecodingError(error);
        }
        return {
          type: dataType,
          kind: "error" as const,
          error
        };
      }
      //now, truncate to appropriate length (keeping the bytes on the right)
      bytes = removePadding(bytes, dataType, paddingMode);
      let asBN = Conversion.toBN(bytes);
      let rawAsBN = Conversion.toBN(rawBytes);
      let asBig = Conversion.shiftBigDown(
        Conversion.toBig(asBN),
        dataType.places
      );
      let rawAsBig = Conversion.shiftBigDown(
        Conversion.toBig(rawAsBN),
        dataType.places
      );
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asBig,
          rawAsBig
        },
        interpretations: {}
      };
    }
  }
}

//NOTE that this function returns a ContractValueInfo, not a ContractResult
export function* decodeContract(
  addressBytes: Uint8Array,
  info: Evm.EvmInfo
): Generator<
  DecoderRequest,
  Format.Values.ContractValueInfo,
  Uint8Array | null
> {
  return (yield* decodeContractAndContext(addressBytes, info)).contractInfo;
}

function* decodeContractAndContext(
  addressBytes: Uint8Array,
  info: Evm.EvmInfo
): Generator<DecoderRequest, ContractInfoAndContext, Uint8Array | null> {
  let address = Evm.Utils.toAddress(addressBytes);
  let rawAddress = Conversion.toHexString(addressBytes);
  let codeBytes: Uint8Array = yield {
    type: "code" as const,
    address
  };
  let code = Conversion.toHexString(codeBytes);
  let context = Contexts.Utils.findContext(info.contexts, code);
  if (context !== null) {
    return {
      context,
      contractInfo: {
        kind: "known" as const,
        address,
        rawAddress,
        class: Contexts.Import.contextToType(context)
      }
    };
  } else {
    return {
      context,
      contractInfo: {
        kind: "unknown" as const,
        address,
        rawAddress
      }
    };
  }
}

//note: address can have extra zeroes on the left like elsewhere, but selector should be exactly 4 bytes
//NOTE this again returns a FunctionExternalValueInfo, not a FunctionExternalResult
export function* decodeExternalFunction(
  addressBytes: Uint8Array,
  selectorBytes: Uint8Array,
  info: Evm.EvmInfo
): Generator<
  DecoderRequest,
  Format.Values.FunctionExternalValueInfo,
  Uint8Array | null
> {
  let { contractInfo: contract, context } = yield* decodeContractAndContext(
    addressBytes,
    info
  );
  let selector = Conversion.toHexString(selectorBytes);
  if (contract.kind === "unknown") {
    return {
      kind: "unknown" as const,
      contract,
      selector
    };
  }
  let abiEntry = context.abi !== undefined ? context.abi[selector] : undefined;
  if (abiEntry === undefined) {
    return {
      kind: "invalid" as const,
      contract,
      selector
    };
  }
  return {
    kind: "known" as const,
    contract,
    selector,
    abi: abiEntry
  };
}

//this one works a bit differently -- in order to handle errors, it *does* return a FunctionInternalResult
function decodeInternalFunction(
  dataType: Format.Types.FunctionInternalType,
  deployedPcBytes: Uint8Array,
  constructorPcBytes: Uint8Array,
  info: Evm.EvmInfo,
  strict: boolean
): Format.Values.FunctionInternalResult {
  const deployedPc: number = Conversion.toBN(deployedPcBytes).toNumber();
  const constructorPc: number = Conversion.toBN(constructorPcBytes).toNumber();
  const context: Format.Types.ContractType = Contexts.Import.contextToType(
    info.currentContext
  );
  //before anything else: do we even have an internal functions table?
  //if not, we'll just return the info we have without really attemting to decode
  if (!info.internalFunctionsTable) {
    return {
      type: dataType,
      kind: "value" as const,
      value: {
        kind: "unknown" as const,
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      },
      interpretations: {}
    };
  }
  //also before we continue: is the PC zero? if so let's just return that
  if (deployedPc === 0 && constructorPc === 0) {
    return {
      type: dataType,
      kind: "value" as const,
      value: {
        kind: "exception" as const,
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      },
      interpretations: {}
    };
  }
  //another check: is only the deployed PC zero?
  if (deployedPc === 0 && constructorPc !== 0) {
    const error = {
      kind: "MalformedInternalFunctionError" as const,
      context,
      deployedProgramCounter: 0,
      constructorProgramCounter: constructorPc
    };
    if (strict) {
      throw new StopDecodingError(error);
    }
    return {
      type: dataType,
      kind: "error" as const,
      error
    };
  }
  //one last pre-check: is this a deployed-format pointer in a constructor?
  if (info.currentContext.isConstructor && constructorPc === 0) {
    const error = {
      kind: "DeployedFunctionInConstructorError" as const,
      context,
      deployedProgramCounter: deployedPc,
      constructorProgramCounter: 0
    };
    if (strict) {
      throw new StopDecodingError(error);
    }
    return {
      type: dataType,
      kind: "error" as const,
      error
    };
  }
  //otherwise, we get our function
  const pc = info.currentContext.isConstructor ? constructorPc : deployedPc;
  const functionEntry = info.internalFunctionsTable[pc];
  if (!functionEntry) {
    //if it's not zero and there's no entry... error!
    const error = {
      kind: "NoSuchInternalFunctionError" as const,
      context,
      deployedProgramCounter: deployedPc,
      constructorProgramCounter: constructorPc
    };
    if (strict) {
      throw new StopDecodingError(error);
    }
    return {
      type: dataType,
      kind: "error" as const,
      error
    };
  }
  if (functionEntry.isDesignatedInvalid) {
    return {
      type: dataType,
      kind: "value" as const,
      value: {
        kind: "exception" as const,
        context,
        deployedProgramCounter: deployedPc,
        constructorProgramCounter: constructorPc
      },
      interpretations: {}
    };
  }
  const name = functionEntry.name;
  const mutability = functionEntry.mutability;
  const definedIn = Evm.Import.functionTableEntryToType(functionEntry); //may be null
  const id = Evm.Import.makeInternalFunctionId(functionEntry);
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "function" as const,
      context,
      deployedProgramCounter: deployedPc,
      constructorProgramCounter: constructorPc,
      name,
      id,
      definedIn,
      mutability
    },
    interpretations: {}
  };
}

function checkPadding(
  bytes: Uint8Array,
  dataType: Format.Types.Type,
  paddingMode: PaddingMode,
  userDefinedTypes?: Format.Types.TypesById
): boolean {
  const length = byteLength(dataType, userDefinedTypes);
  const paddingType = getPaddingType(dataType, paddingMode);
  if (paddingMode === "permissive") {
    switch (dataType.typeClass) {
      case "bool":
      case "enum":
      case "function":
        //these three types are checked even in permissive mode
        return checkPaddingDirect(bytes, length, paddingType);
      default:
        return true;
    }
  } else {
    return checkPaddingDirect(bytes, length, paddingType);
  }
}

function removePadding(
  bytes: Uint8Array,
  dataType: Format.Types.Type,
  paddingMode: PaddingMode,
  userDefinedTypes?: Format.Types.TypesById
): Uint8Array {
  const length = byteLength(dataType, userDefinedTypes);
  const paddingType = getPaddingType(dataType, paddingMode);
  return removePaddingDirect(bytes, length, paddingType);
}

function removePaddingDirect(
  bytes: Uint8Array,
  length: number,
  paddingType: PaddingType
) {
  switch (paddingType) {
    case "right":
      return bytes.slice(0, length);
    default:
      return bytes.slice(-length);
  }
}

function checkPaddingDirect(
  bytes: Uint8Array,
  length: number,
  paddingType: PaddingType
) {
  switch (paddingType) {
    case "left":
      return checkPaddingLeft(bytes, length);
    case "right":
      return checkPaddingRight(bytes, length);
    case "signed":
      return checkPaddingSigned(bytes, length);
    case "signedOrLeft":
      return (
        checkPaddingSigned(bytes, length) || checkPaddingLeft(bytes, length)
      );
  }
}

function getPaddingType(
  dataType: Format.Types.Type,
  paddingMode: PaddingMode
): PaddingType {
  switch (paddingMode) {
    case "right":
      return "right";
    case "default":
    case "permissive":
      return defaultPaddingType(dataType);
    case "zero": {
      const defaultType = defaultPaddingType(dataType);
      return defaultType === "signed" ? "left" : defaultType;
    }
    case "defaultOrZero": {
      const defaultType = defaultPaddingType(dataType);
      return defaultType === "signed" ? "signedOrLeft" : defaultType;
    }
  }
}

function defaultPaddingType(dataType: Format.Types.Type): PaddingType {
  switch (dataType.typeClass) {
    case "bytes":
      return "right";
    case "int":
    case "fixed":
      return "signed";
    case "function":
      if (dataType.visibility === "external") {
        return "right";
      }
    //otherwise, fall through to default
    default:
      return "left";
  }
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

//the following types are intended for internal use only
/**
 * @hidden
 */
export interface ContractInfoAndContext {
  contractInfo: Format.Values.ContractValueInfo;
  context?: Contexts.Context;
}
