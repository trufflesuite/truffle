import debugModule from "debug";
const debug = debugModule("decoder:decode:calldata");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { CalldataPointer, DataPointer } from "../types/pointer";
import { CalldataMemberAllocation } from "../types/allocation";
import { calldataSize } from "../allocate/calldata";
import { EvmInfo } from "../types/evm";
import range from "lodash.range";

export default async function decodeCalldata(definition: DecodeUtils.AstDefinition, pointer: CalldataPointer, info: EvmInfo, base: number = 0): Promise <any> {
  if(DecodeUtils.Definition.isReference(definition)) {
    let dynamic = calldataSize(definition, info.referenceDeclarations, info.calldataAllocations)[1];
    if(dynamic) {
      return await decodeCalldataReferenceByAddress(definition, pointer, info, base);
    }
    else {
      return await decodeCalldataReferenceStatic(definition, pointer, info);
    }
  }
  else {
    debug("pointer %o", pointer);
    return await decodeValue(definition, pointer, info);
  }
}

export async function decodeCalldataReferenceByAddress(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo, base: number = 0): Promise<any> {
  const { state } = info;
  debug("pointer %o", pointer);
  let rawValue: Uint8Array = await read(pointer, state);

  let startPosition = DecodeUtils.Conversion.toBN(rawValue).toNumber() + base;
  debug("startPosition %d", startPosition);

  let [size, dynamic] = calldataSize(definition, info.referenceDeclarations, info.calldataAllocations);
  if(!dynamic) { //this will only come up when called from stack.ts
    let staticPointer = {
      calldata: {
        start: startPosition,
        length: size
      }
    }
    return await decodeCalldataReferenceStatic(definition, staticPointer, info);
  }
  let length;
  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "bytes":
    case "string":
      length = DecodeUtils.Conversion.toBN(await read({
        calldata: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE}
      }, state)).toNumber(); //initial word contains length

      let childPointer: CalldataPointer = {
        calldata: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length }
      }

      return await decodeValue(definition, childPointer, info);

    case "array":

      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        length = DecodeUtils.Conversion.toBN(await read({
          calldata: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE },
          }, state)).toNumber();  // initial word contains array length
        startPosition += DecodeUtils.EVM.WORD_SIZE; //increment startPosition to
        //next word, as first word was used for length
      }
      else {
        length = DecodeUtils.Definition.staticLength(definition);
      }

      //note: I've written this fairly generically, but it is worth noting that
      //since this array is of dynamic type, we know that if it's static length
      //then size must be EVM.WORD_SIZE

      let baseDefinition = definition.baseType || definition.typeName.baseType;
        //I'm deliberately not using the DecodeUtils function for this, because
        //we should *not* need a faked-up type here!

      // replace erroneous `_storage_` type identifiers with `_calldata_`
      baseDefinition = DecodeUtils.Definition.spliceLocation(baseDefinition, "calldata");
      let baseSize = calldataSize(baseDefinition, info.referenceDeclarations, info.calldataAllocations)[0];

      return await Promise.all(range(length).map( (index: number) =>
        decodeCalldata(baseDefinition,
          { calldata: {
            start: startPosition + index * baseSize,
            length: baseSize
          }},
          info, startPosition) //pointer base is always start of list, never the length
      ));

    case "struct":
      const { referenceDeclarations, calldataAllocations } = info;

      const referencedDeclaration = definition.typeName
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;
      const structAllocation = calldataAllocations[referencedDeclaration];

      if(structAllocation == null) {
        return undefined; //this should never happen
      }

      const decodeAllocation = async (memberAllocation: CalldataMemberAllocation) => {
        const memberPointer = memberAllocation.pointer;
        const childPointer: CalldataPointer = {
          calldata: {
            start: startPosition + memberPointer.calldata.start,
            length: memberPointer.calldata.length
          }
        };

        let memberDefinition = memberAllocation.definition;

        // replace erroneous `_storage` type identifiers with `_calldata`
        memberDefinition = DecodeUtils.Definition.spliceLocation(memberDefinition, "calldata");
        //there also used to be code here to add on the "_ptr" ending when absent, but we
        //presently ignore that ending, so we'll skip that

        let decoded = await decodeCalldata(memberDefinition, childPointer, info, startPosition);
          //note in this case startPosition has not been altered,
          //which is how we want it

        return {
          [memberDefinition.name]: decoded
        };
      }

      const decodings = Object.values(structAllocation.members).map(decodeAllocation);

      return Object.assign({}, ...await Promise.all(decodings));

    default:
      // debug("Unknown calldata reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
  }
}

export async function decodeCalldataReferenceStatic(definition: DecodeUtils.AstDefinition, pointer: CalldataPointer, info: EvmInfo): Promise <any> {
  const { state } = info;
  debug("static");
  debug("pointer %o", pointer);

  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "array":

      //we're in the static case, so we know the array must be statically sized
      const length = DecodeUtils.Definition.staticLength(definition);
      let size = calldataSize(definition, info.referenceDeclarations, info.calldataAllocations)[0];

      let baseDefinition = definition.baseType || definition.typeName.baseType;
        //I'm deliberately not using the DecodeUtils function for this, because
        //we should *not* need a faked-up type here!

      // replace erroneous `_storage_` type identifiers with `_calldata_`
      baseDefinition = DecodeUtils.Definition.spliceLocation(baseDefinition, "calldata");
      let baseSize = calldataSize(baseDefinition, info.referenceDeclarations, info.calldataAllocations)[0];

      return await Promise.all(range(length).map( (index: number) =>
        decodeCalldata(baseDefinition,
          { calldata: {
            start: pointer.calldata.start + index * baseSize,
            length: baseSize
          }},
          info) //static case so don't need base
      ));

    case "struct":
      //this one is exactly the same as in the dynamic case,
      //except that we don't need to pass base to decodeCalldata
      //(or in other words, COPYPASTE WARNING; sorry future me :P )
      const { referenceDeclarations, calldataAllocations } = info;

      const referencedDeclaration = definition.typeName
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;
      const structAllocation = calldataAllocations[referencedDeclaration];

      if(structAllocation == null) {
        return undefined; //this should never happen
      }

      const decodeAllocation = async (memberAllocation: CalldataMemberAllocation) => {
        const memberPointer = memberAllocation.pointer;
        const childPointer: CalldataPointer = {
          calldata: {
            start: pointer.calldata.start + memberPointer.calldata.start,
            length: memberPointer.calldata.length
          }
        };

        let memberDefinition = memberAllocation.definition;

        // replace erroneous `_storage` type identifiers with `_calldata`
        memberDefinition = DecodeUtils.Definition.spliceLocation(memberDefinition, "calldata");
        //there also used to be code here to add on the "_ptr" ending when absent, but we
        //presently ignore that ending, so we'll skip that

        let decoded = await decodeCalldata(memberDefinition, childPointer, info);

        return {
          [memberDefinition.name]: decoded
        };
      }

      const decodings = Object.values(structAllocation.members).map(decodeAllocation);

      return Object.assign({}, ...await Promise.all(decodings));

    default:
      // debug("Unknown calldata reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
  }
}
