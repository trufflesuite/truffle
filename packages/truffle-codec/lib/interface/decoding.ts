import debugModule from "debug";
const debug = debugModule("codec:interface:decoding");

import { AstDefinition, Types, Values } from "truffle-codec-utils";
import * as CodecUtils from "truffle-codec-utils";
import * as Pointer from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import { CalldataAllocation, EventAllocation, EventArgumentAllocation } from "../types/allocation";
import { CalldataDecoding, LogDecoding, AbiArgument } from "../types/wire";
import { encodeTupleAbi } from "../encode/abi";
import read from "../read";
import decode from "../decode";

export function* decodeVariable(definition: AstDefinition, pointer: Pointer.DataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  let compiler = info.currentContext.compiler;
  let dataType = Types.definitionToType(definition, compiler);
  debug("definition %O", definition);
  return yield* decode(dataType, pointer, info); //no need to pass an offset
}

export function* decodeCalldata(info: EvmInfo): IterableIterator<CalldataDecoding | DecoderRequest | Values.Result | GeneratorJunk> {
  const context = info.currentContext;
  if(context === null) {
    //if we don't know the contract ID, we can't decode
    return {
      kind: "unknown",
      decodingMode: "full",
      data: CodecUtils.Conversion.toHexString(info.state.calldata)
    }
  }
  const compiler = info.currentContext.compiler;
  const contractId = context.contractId;
  const contractType = CodecUtils.Contexts.contextToType(context);
  const allocations = info.allocations.calldata[contractId];
  let allocation: CalldataAllocation;
  let isConstructor: boolean = info.currentContext.isConstructor;
  let selector: string;
  //first: is this a creation call?
  if(isConstructor) {
    allocation = allocations.constructorAllocation;
  }
  else {
    //skipping any error-handling on this read, as a calldata read can't throw anyway
    let rawSelector = <Uint8Array> (yield* read(
      { location: "calldata",
        start: 0,
        length: CodecUtils.EVM.SELECTOR_SIZE
      },
      info.state
    ));
    selector = CodecUtils.Conversion.toHexString(rawSelector);
    allocation = allocations.functionAllocations[selector];
  }
  if(allocation === undefined) {
    return {
      kind: "fallback",
      class: contractType,
      data: CodecUtils.Conversion.toHexString(info.state.calldata),
      decodingMode: "full",
    };
  }
  //you can't map with a generator, so we have to do this map manually
  let decodedArguments: AbiArgument[] = [];
  for(const argumentAllocation of allocation.arguments) {
    const value = <Values.Result> (yield* decode(
      Types.definitionToType(argumentAllocation.definition, compiler),
      argumentAllocation.pointer,
      info,
      { abiPointerBase: allocation.offset } //note the use of the offset for decoding pointers!
    ));
    const name = argumentAllocation.definition.name;
    decodedArguments.push(
      name //deliberate general falsiness test
        ? { name, value }
        : { value }
    );
  }
  if(isConstructor) {
    return {
      kind: "constructor",
      class: contractType,
      arguments: decodedArguments,
      bytecode: CodecUtils.Conversion.toHexString(info.state.calldata.slice(0, allocation.offset)),
      decodingMode: "full",
    };
  }
  else {
    return {
      kind: "function",
      class: contractType,
      name: allocation.definition.name,
      arguments: decodedArguments,
      selector,
      decodingMode: "full"
    };
  }
}

//note: this will likely change in the future to take options rather than targetName, but I'm
//leaving it alone for now, as I'm not sure what form those options will take
//(and this is something we're a bit more OK with breaking since it's primarily
//for internal use :) )
export function* decodeEvent(info: EvmInfo, address: string, targetName?: string): IterableIterator<LogDecoding[] | DecoderRequest | Values.Result | GeneratorJunk> {
  const allocations = info.allocations.event;
  debug("event allocations: %O", allocations);
  let rawSelector: Uint8Array;
  let selector: string;
  let contractAllocations: {[contractId: number]: EventAllocation}; //for non-anonymous events
  let libraryAllocations: {[contractId: number]: EventAllocation}; //similar
  const topicsCount = info.state.eventtopics.length;
  //yeah, it's not great to read directly from the state like this (bypassing read), but what are you gonna do?
  if(topicsCount > 0) {
    rawSelector = <Uint8Array> (yield* read(
      { location: "eventtopic",
        topic: 0
      },
      info.state
    ));
    selector = CodecUtils.Conversion.toHexString(rawSelector);
    ({ contract: contractAllocations, library: libraryAllocations } = allocations[topicsCount].bySelector[selector] || {contract: {}, library: {}});
  }
  else {
    //if we don't have a selector, it means we don't have any non-anonymous events
    contractAllocations = {};
    libraryAllocations = {};
  }
  //now: let's get our allocations for anonymous events
  //note: these ones map contract IDs to *arrays* of event allocations, not individual allocations!
  const { contract: contractAnonymousAllocations, library: libraryAnonymousAllocations } = allocations[topicsCount].anonymous;
  //now: what contract are we (probably) dealing with? let's get its code to find out
  const codeBytes: Uint8Array = yield {
    type: "code",
    address
  };
  const codeAsHex = CodecUtils.Conversion.toHexString(codeBytes);
  const contractContext = CodecUtils.Contexts.findDecoderContext(info.contexts, codeAsHex);
  let possibleContractAllocations: EventAllocation[]; //excludes anonymous events
  let possibleContractAnonymousAllocations: EventAllocation[];
  if(contractContext) {
    //if we found the contract, maybe it's from that contract
    const contractId = contractContext.contractId;
    const contractAllocation = contractAllocations[contractId];
    const contractAnonymousAllocation = contractAnonymousAllocations[contractId];
    possibleContractAllocations = contractAllocation
      ? [contractAllocation]
      : [];
    possibleContractAnonymousAllocations = contractAnonymousAllocation || [];
  }
  else {
    //if we couldn't determine the contract, well, we have to assume it's from a library
    possibleContractAllocations = [];
    possibleContractAnonymousAllocations = [];
  }
  //now we get all the library allocations!
  const possibleLibraryAllocations = Object.values(libraryAllocations);
  const possibleLibraryAnonymousAllocations = [].concat(...Object.values(libraryAnonymousAllocations));
  //now we put it all together!
  const possibleAllocations = possibleContractAllocations.concat(possibleLibraryAllocations);
  const possibleAnonymousAllocations = possibleContractAnonymousAllocations.concat(possibleLibraryAnonymousAllocations);
  const possibleAllocationsTotal = possibleAllocations.concat(possibleAnonymousAllocations);
  let decodings: LogDecoding[] = [];
  allocationAttempts: for(const allocation of possibleAllocationsTotal) {
    //first: do a name check so we can skip decoding if name is wrong
    if(targetName !== undefined && allocation.definition.name !== targetName) {
      continue;
    }
    const id = allocation.contractId;
    const attemptContext = info.contexts[id];
    const contractType = CodecUtils.Contexts.contextToType(attemptContext);
    //you can't map with a generator, so we have to do this map manually
    let decodedArguments: AbiArgument[] = [];
    for(const argumentAllocation of allocation.arguments) {
      let value: Values.Result;
      try {
        value = <Values.Result> (yield* decode(
          Types.definitionToType(argumentAllocation.definition, attemptContext.compiler),
          argumentAllocation.pointer,
          info,
          { strictAbiMode: true } //turns on STRICT MODE to cause more errors to be thrown
        ));
      }
      catch(_) {
        continue allocationAttempts; //if an error occurred, this isn't a valid decoding!
      }
      const name = argumentAllocation.definition.name;
      const indexed = argumentAllocation.pointer.location === "eventtopic";
      decodedArguments.push(
        name //deliberate general falsiness test
          ? { name, indexed, value }
          : { indexed, value }
      );
    }
    debug("decodedArguments: %O", decodedArguments);
    //OK, so, having decoded the result, the question is: does it reencode to the original?
    //first, we have to filter out the indexed arguments, and also get rid of the name information
    const nonIndexedValues = decodedArguments
      .filter(argument => !argument.indexed)
      .map(argument => argument.value);
    //now, we can encode!
    debug("nonIndexedValues: %O", nonIndexedValues);
    const reEncodedData = encodeTupleAbi(nonIndexedValues, info.allocations.abi);
    //are they equal?
    const encodedData = info.state.eventdata; //again, not great to read this directly, but oh well
    if(CodecUtils.EVM.equalData(encodedData, reEncodedData)) {
      if(allocation.definition.anonymous) {
        decodings.push({
          kind: "anonymous",
          class: contractType,
          name: allocation.definition.name,
          arguments: decodedArguments,
          decodingMode: "full"
        });
      }
      else {
        decodings.push({
          kind: "event",
          class: contractType,
          name: allocation.definition.name,
          arguments: decodedArguments,
          selector,
          decodingMode: "full"
        });
      }
    }
    //otherwise, just move on
  }
  return decodings;
}
