import debugModule from "debug";
const debug = debugModule("decoder:decode:value");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";
import utf8 from "utf8";
import { DataPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { EvmEnum } from "../interface/contract-decoder";
import { DecoderRequest } from "../types/request";

export default function* decodeValue(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo): IterableIterator<undefined | boolean | BN | string | DecoderRequest | Uint8Array> {
  //NOTE: this does not actually return a Uint8Aarray, but due to the use of yield* read,
  //we have to include it in the type :-/
  const { state } = info;

  let bytes = yield* read(pointer, state);
  if (bytes == undefined) {
    debug("segfault, pointer %o, state: %O", pointer, state);
    return undefined;
  }

  let length;

  debug("definition %O", definition);
  debug("pointer %o", pointer);

  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "bool":
      return !DecodeUtils.Conversion.toBN(bytes).isZero();

    case "uint":
      length = DecodeUtils.Definition.specifiedSize(definition);
      bytes = bytes.slice(-length); //chop off padding
      return DecodeUtils.Conversion.toBN(bytes);

    case "int":
      length = DecodeUtils.Definition.specifiedSize(definition);
      bytes = bytes.slice(-length); //chop off padding
      return DecodeUtils.Conversion.toSignedBN(bytes);

    case "address":
      return DecodeUtils.Conversion.toAddress(bytes);

    case "contract":
      return yield* decodeContract(bytes, info);

    case "bytes":
      debug("typeIdentifier %s %o", DecodeUtils.Definition.typeIdentifier(definition), bytes);
      //if there's a static size, we want to truncate to that length
      length = DecodeUtils.Definition.specifiedSize(definition);
      if(length !== null) {
        bytes = bytes.slice(0, length);
      }
      //we don't need to pass in length here, since that's for *adding* padding
      return DecodeUtils.Conversion.toHexString(bytes);

    case "string":
      debug("typeIdentifier %s %o", DecodeUtils.Definition.typeIdentifier(definition), bytes);
      if (typeof bytes == "string") {
        return bytes;
      }
      try {
        return utf8.decode(String.fromCharCode.apply(undefined, bytes));
      }
      catch(error) {
        return null; //HACK: we use null as our error value here rather than
        //undefined to prevent potentially throwing the debugger into an
        //infinite loop
        //(this will be saner in 5.1 :P )
      }

    case "enum":
      const numRepresentation = DecodeUtils.Conversion.toBN(bytes).toNumber();
      debug("numRepresentation %d", numRepresentation);
      const referenceId = definition.referencedDeclaration || (definition.typeName ? definition.typeName.referencedDeclaration : undefined);
      const enumDeclaration = info.referenceDeclarations[referenceId];
      const decodedValue = enumDeclaration.members[numRepresentation].name;

      return <EvmEnum>{
        type: enumDeclaration.name,
        value: enumDeclaration.name + "." + decodedValue
      }

    case "function":
      switch (DecodeUtils.Definition.visibility(definition)) {
        case "external":
          let address = bytes.slice(0, DecodeUtils.EVM.ADDRESS_SIZE);
          let selector = bytes.slice(DecodeUtils.EVM.ADDRESS_SIZE, DecodeUtils.EVM.ADDRESS_SIZE + DecodeUtils.EVM.SELECTOR_SIZE);
          return yield* decodeExternalFunction(address, selector, info);
        case "internal":
          let pc: Uint8Array;
          if(info.currentContext.isConstructor) {
            //get 2nd-to-last 4 bytes
            pc = bytes.slice(-DecodeUtils.EVM.PC_SIZE * 2, -DecodeUtils.EVM.PC_SIZE);
          }
          else {
            //get last 4 bytes
            pc = bytes.slice(-DecodeUtils.EVM.PC_SIZE);
          }
          return decodeInternalFunction(pc, info);
        default:
          debug("unknown visibility: %s", DecodeUtils.Definition.visibility(definition));
      }

    default:
      debug("Unknown value type: %s", DecodeUtils.Definition.typeIdentifier(definition));
      return undefined;
  }
}

export function* decodeContract(addressBytes: Uint8Array, info: EvmInfo): IterableIterator<string | DecoderRequest | Uint8Array> {
  let address = DecodeUtils.Conversion.toAddress(addressBytes);
  let codeBytes: Uint8Array = yield {
    type: "code",
    address
  };
  let code = DecodeUtils.Conversion.toHexString(codeBytes);
  let context = DecodeUtils.Contexts.findDecoderContext(info.contexts, code);
  if(context !== null && context.contractName !== undefined) {
    return context.contractName + "(" + address + ")";
  }
  else {
    return address;
  }
}

//note: address can have extra zeroes on the left like elsewhere, but selector should be exactly 4 bytes
export function* decodeExternalFunction(addressBytes: Uint8Array, selectorBytes: Uint8Array, info: EvmInfo): IterableIterator<string | DecoderRequest | Uint8Array> {
  //note: yes, this shares a fair amount of code with decodeContract.
  //I'm going to factor this in a later PR; I'm deliberately not doing that
  //for now, though.
  let address = DecodeUtils.Conversion.toAddress(addressBytes);
  let selector = DecodeUtils.Conversion.toHexString(selectorBytes);
  let codeBytes: Uint8Array = yield {
    type: "code",
    address
  };
  let code = DecodeUtils.Conversion.toHexString(codeBytes);
  let context = DecodeUtils.Contexts.findDecoderContext(info.contexts, code);
  if(context === null || context.contractName === undefined) {
    //note: I'm assuming it never occurs that we have the ABI but not the
    //contract name
    return `${address}.call(${selector}...)`;
  }
  let abiEntry = context.abi !== undefined
    ? context.abi[selector]
    : undefined;
  if(abiEntry === undefined) {
    return `${context.contractName}(${address}).call(${selector}...)`;
  }
  let functionName = abiEntry.name;
  return `${context.contractName}(${address}).${functionName}`;
}

export function decodeInternalFunction(pcBytes: Uint8Array, info: EvmInfo): string | undefined {
  let pc: number = DecodeUtils.Conversion.toBN(pcBytes).toNumber();
  //before anything else: do we even have an internal functions table?
  //if not, this is being (presumably) used from the contract decoder, and we don't
  //support decoding internal functions there
  if(!info.internalFunctionsTable) {
    return "<decoding not supported>";
  }
  //also before we continue: is the PC zero? if so let's just return that
  if(pc === 0) {
    return "<zero>";
  }
  //otherwise, we get our function
  let functionEntry = info.internalFunctionsTable[pc];
  if(!functionEntry) {
    //if it's not zero and there's no entry... we give up :P
    return undefined;
  }
  if(functionEntry.isDesignatedInvalid) {
    return "assert(false)";
  }
  return functionEntry.contractName + "." + functionEntry.name;
}
