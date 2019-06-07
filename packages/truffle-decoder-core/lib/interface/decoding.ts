import debugModule from "debug";
const debug = debugModule("decoder-core:interface");

import { AstDefinition, Types, Values } from "truffle-decode-utils";
import * as DecodeUtils from "truffle-decode-utils";
import * as Pointer from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import { CalldataAllocation, EventAllocation } from "../types/allocation";
import decode from "../decode";

export function* decodeVariable(definition: AstDefinition, pointer: Pointer.DataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  let dataType = Types.definitionToType(definition);
  debug("definition %O", definition);
  return yield* decode(dataType, pointer, info); //no need to pass an offset
}

export function* decodeCalldata(info: EvmInfo, contractType: DecodeUtils.Types.ContractType | null): IterableIterator<CalldataDecoding | DecoderRequest | Values.Result | GeneratorJunk> {
  if(contractType === null) {
    //if we don't know the contract ID, we can't decode
    return {
      kind: "unknown";
    }
  }
  const contractId = contractType.id;
  const allocations = info.allocations.calldata[contractId];
  let allocation: CalldataAllocation;
  let isConstructor: boolean = info.currentContext.isConstructor;
  //first: is this a creation call?
  if(isConstructor) {
    allocation = allocations.constructorAllocation;
  }
  else {
    //TODO: error-handling here
    let rawSelector = read(info.state,
      { location: "calldata",
        start: 0,
        length: DecodeUtils.EVM.SELECTOR_SIZE
      }
    );
    let selector = DecodeUtils.EVM.toHexString(rawSelector);
    allocation = allocations[selector];
  }
  if(allocation === undefined) {
    return {
      kind: "fallback",
      class: contractType
    };
  }
  let decodedArguments = allocation.arguments.map(
    argumentAllocation => {
      const value = decode(
        Types.definitionToType(argumentAllocation.definition),
        argumentAllocation.pointer,
        info,
        allocation.offset //note the use of the offset for decoding pointers!
      );
      const name = argumentAllocation.definition.name;
      return name === undefined
        ? { value }
        : { name, value };
    }
  );
  if(isConstructor) {
    return {
      kind: "constructor",
      class: contractType,
      arguments: decodedArguments
    };
  }
  else {
    return {
      kind: "function",
      class: contractType
      name: allocation.definition.name,
      arguments: decodedArguments
    };
  }
}

export function* decodeEvent(info: EvmInfo, contractType: DecodeUtils.Types.ContractType | null): IterableIterator<EventDecoding | DecoderRequest | Values.Result | GeneratorJunk> {
  if(contractType === null) {
    //if we don't know the contract ID, we can't decode
    return {
      kind: "unknown";
    }
  }
  const contractId = contractType.id;
  const allocations = info.allocations.event[contractId];
  //TODO: error-handling here
  let rawSelector = read(info.state,
    { location: "eventdata",
      topic: 0
    }
  );
  let selector = DecodeUtils.EVM.toHexString(rawSelector);
  allocation = allocations[selector];
  if(allocation === undefined) {
    //we can't decode
    return {
      kind: "anonymous",
      class: contractType
    };
  }
  let decodedArguments = allocation.arguments.map(
    argumentAllocation => {
      const value = decode(
        Types.definitionToType(argumentAllocation.definition),
        argumentAllocation.pointer,
        info,
        0 //offset is always 0 but let's be explicit
      );
      const name = argumentAllocation.definition.name;
      return name === undefined
        ? { value }
        : { name, value };
    }
  );
  return {
    kind: "event",
    class: contractType,
    name: allocation.definition.name,
    arguments: decodedArguments
  };
}
