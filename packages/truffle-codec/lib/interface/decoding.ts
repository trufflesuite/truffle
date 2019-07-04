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
      kind: "unknown"
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
    let rawSelector = <Uint8Array> read(
      { location: "calldata",
        start: 0,
        length: CodecUtils.EVM.SELECTOR_SIZE
      },
      info.state
    ).next().value; //no requests should occur, we can just get the first value
    selector = CodecUtils.Conversion.toHexString(rawSelector);
    allocation = allocations.functionAllocations[selector];
  }
  if(allocation === undefined) {
    return {
      kind: "fallback",
      class: contractType,
      data: CodecUtils.Conversion.toHexString(info.state.calldata)
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
      bytecode: CodecUtils.Conversion.toHexString(info.state.calldata.slice(0, allocation.offset))
    };
  }
  else {
    return {
      kind: "function",
      class: contractType,
      name: allocation.definition.name,
      arguments: decodedArguments,
      selector
    };
  }
}

export function* decodeEvent(info: EvmInfo, address: string, targetName: string | null = null): IterableIterator<LogDecoding[] | DecoderRequest | Values.Result | GeneratorJunk> {
  const allocations = info.allocations.event;
  debug("event allocations: %O", allocations);
  let rawSelector: Uint8Array;
  try {
    rawSelector = <Uint8Array> read(
      { location: "eventtopic",
        topic: 0
      },
      info.state
    ).next().value; //no requests should occur, we can just get the first value
  }
  catch(error) {
    //if we can't read the selector, return an empty set of decodings
    return [];
  }
  const selector = CodecUtils.Conversion.toHexString(rawSelector);
  const topicsCount = info.state.eventtopics.length;
  //yeah, it's not great to read directly from the state like this (bypassing read), but what are you gonna do?
  const { contract: contractAllocations, library: libraryAllocations } = allocations[topicsCount].bySelector[selector];
  const { contract: contractAnonymousAllocations, library: libraryAnonymousAllocations } = allocations[topicsCount].anonymous;
  //now: what contract are we (probably) dealing with? let's get its code to find out
  const codeBytes: Uint8Array = yield {
    type: "code",
    address
  };
  const codeAsHex = CodecUtils.Conversion.toHexString(codeBytes);
  const contractContext = CodecUtils.Contexts.findDecoderContext(info.contexts, codeAsHex);
  //the following two arrays contain id-allocation pairs
  let possibleContractAllocations: [string, EventAllocation][]; //excludes anonymous events
  let possibleContractAnonymousAllocations: [string, EventAllocation][];
  //should be number, but we have to temporarily pass through string to get compilation to work...
  //(these are ID/allocation pairs)
  if(contractContext) {
    //if we found the contract, maybe it's from that contract
    const contractId = contractContext.contractId;
    const contractAllocation = contractAllocations[contractId];
    const contractAnonymousAllocation = contractAnonymousAllocations[contractId];
    possibleContractAllocations = contractAllocation
      ? [[contractId.toString(), contractAllocation]] //array of a single pair
      : [];
    if(contractAnonymousAllocation) {
      possibleContractAnonymousAllocations = contractAnonymousAllocation.map(
        allocation => [contractId.toString(), allocation]
      );
    }
    else {
      possibleContractAnonymousAllocations = [];
    }
  }
  else {
    //if we couldn't determine the contract, well, we have to assume it's from a library
    possibleContractAllocations = [];
    possibleContractAnonymousAllocations = [];
  }
  //now we get all the library allocations!
  const possibleLibraryAllocations = Object.entries(libraryAllocations);
  const possibleLibraryAnonymousAllocations = [].concat(...Object.entries(libraryAnonymousAllocations).map(
    ([id, allocations]) => allocations.map(allocation => [id, allocation])
  ));
  //now we put it all together!
  const possibleAllocations = possibleContractAllocations.concat(possibleLibraryAllocations);
  const possibleAnonymousAllocations = possibleContractAnonymousAllocations.concat(possibleLibraryAnonymousAllocations);
  const possibleAllocationsTotal = possibleAllocations.concat(possibleAnonymousAllocations);
  let decodings: LogDecoding[] = [];
  for(const [id, allocation] of possibleAllocationsTotal) {
    try {
      //first: do a name check so we can skip decoding if name is wrong
      if(targetName !== null && allocation.definition.name !== targetName) {
        continue;
      }
      const attemptContext = info.contexts[parseInt(id)];
      const contractType = CodecUtils.Contexts.contextToType(attemptContext);
      //you can't map with a generator, so we have to do this map manually
      let decodedArguments: AbiArgument[] = [];
      for(const argumentAllocation of allocation.arguments) {
        const value = <Values.Result> (yield* decode(
          Types.definitionToType(argumentAllocation.definition, attemptContext.compiler),
          argumentAllocation.pointer,
          info,
          { strictAbiMode: true } //turns on STRICT MODE to cause more errors to be thrown
        ));
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
            arguments: decodedArguments
          });
        }
        else {
          decodings.push({
            kind: "event",
            class: contractType,
            name: allocation.definition.name,
            arguments: decodedArguments,
            selector
          });
        }
      }
      //otherwise, just move on
    }
    catch(error) {
      continue; //if an error occurred, this isn't a valid decoding!
    }
  }
  return decodings;
}
