import debugModule from "debug";
const debug = debugModule("codec:interface:decoding");

import { AstDefinition, Types, Values } from "truffle-codec-utils";
import * as CodecUtils from "truffle-codec-utils";
import * as Pointer from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import { StopDecodingError } from "../types/errors";
import { CalldataAllocation, EventAllocation, EventArgumentAllocation } from "../types/allocation";
import { CalldataDecoding, LogDecoding, AbiArgument, DecodingMode } from "../types/decoding";
import { encodeTupleAbi } from "../encode/abi";
import read from "../read";
import decode from "../decode";

export function* decodeVariable(definition: AstDefinition, pointer: Pointer.DataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  let compiler = info.currentContext.compiler;
  let dataType = Types.definitionToType(definition, compiler);
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
  const compiler = context.compiler;
  const contextHash = context.context;
  const contractType = CodecUtils.Contexts.contextToType(context);
  const isConstructor: boolean = context.isConstructor;
  const allocations = info.allocations.calldata;
  let allocation: CalldataAllocation;
  let selector: string;
  //first: is this a creation call?
  if(isConstructor) {
    allocation = allocations.constructorAllocations[contextHash];
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
    allocation = allocations.functionAllocations[contextHash][selector];
  }
  if(allocation === undefined) {
    return {
      kind: "message",
      class: contractType,
      abi: context.hasFallback ? CodecUtils.AbiUtils.fallbackAbiForPayability(context.payable) : null,
      data: CodecUtils.Conversion.toHexString(info.state.calldata),
      decodingMode: "full"
    };
  }
  let decodingMode: DecodingMode = allocation.allocationMode; //starts out this way, degrades to ABI if necessary
  //you can't map with a generator, so we have to do this map manually
  let decodedArguments: AbiArgument[] = [];
  try {
    for(const argumentAllocation of allocation.arguments) {
      const value = <Values.Result> (yield* decode(
        argumentAllocation.type,
        argumentAllocation.pointer,
        info,
        { 
          abiPointerBase: allocation.offset, //note the use of the offset for decoding pointers!
          allowRetry: decodingMode === "full"
        }
      ));
      const name = argumentAllocation.name;
      decodedArguments.push(
        name //deliberate general falsiness test
          ? { name, value }
          : { value }
      );
    }
  }
  catch(error) {
    if(error instanceof StopDecodingError && error.allowRetry && decodingMode === "full") {
      decodingMode = "abi";
      for(const argumentAllocation of allocation.arguments) {
        const value = <Values.Result> (yield* decode(
          CodecUtils.abifyType(argumentAllocation.type), //type is now abified!
          argumentAllocation.pointer,
          info,
          { 
            abiPointerBase: allocation.offset //note the use of the offset for decoding pointers!
            //we no longer allow a retry, not that it matters
          }
        ));
        const name = argumentAllocation.name;
        decodedArguments.push(
          name //deliberate general falsiness test
            ? { name, value }
            : { value }
        );
      }
    }
    //we shouldn't be getting other exceptions, but if we do, we don't know
    //how to handle them, so uhhhh just rethrow I guess??
    else {
      throw error;
    }
  }
  if(isConstructor) {
    return {
      kind: "constructor",
      class: contractType,
      arguments: decodedArguments,
      abi: allocation.abi,
      bytecode: CodecUtils.Conversion.toHexString(info.state.calldata.slice(0, allocation.offset)),
      decodingMode
    };
  }
  else {
    return {
      kind: "function",
      class: contractType,
      abi: allocation.abi,
      arguments: decodedArguments,
      selector,
      decodingMode
    };
  }
}

//note: this will likely change in the future to take options rather than targetName, but I'm
//leaving it alone for now, as I'm not sure what form those options will take
//(and this is something we're a bit more OK with breaking since it's primarily
//for internal use :) )
export function* decodeEvent(info: EvmInfo, address: string, targetName?: string): IterableIterator<LogDecoding[] | DecoderRequest | Values.Result | GeneratorJunk> {
  const allocations = info.allocations.event;
  let rawSelector: Uint8Array;
  let selector: string;
  let contractAllocations: {[contextHash: string]: EventAllocation}; //for non-anonymous events
  let libraryAllocations: {[contextHash: string]: EventAllocation}; //similar
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
    const contextHash = contractContext.context;
    const contractAllocation = contractAllocations[contextHash];
    const contractAnonymousAllocation = contractAnonymousAllocations[contextHash];
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
    debug("trying allocation: %O", allocation);
    if(targetName !== undefined && allocation.abi.name !== targetName) {
      continue;
    }
    let decodingMode: DecodingMode = allocation.allocationMode; //starts out here; degrades to abi if necessary
    const contextHash = allocation.contextHash;
    const attemptContext = info.contexts[contextHash];
    const contractType = CodecUtils.Contexts.contextToType(attemptContext);
    //you can't map with a generator, so we have to do this map manually
    let decodedArguments: AbiArgument[] = [];
    for(const argumentAllocation of allocation.arguments) {
      let value: Values.Result;
      //if in full mode, use the allocation's listed data type.
      //if in ABI mode, abify it before use.
      let dataType = decodingMode === "full" ? argumentAllocation.type : CodecUtils.abifyType(argumentAllocation.type);
      try {
        value = <Values.Result> (yield* decode(
          dataType,
          argumentAllocation.pointer,
          info,
          {
            strictAbiMode: true, //turns on STRICT MODE to cause more errors to be thrown
            allowRetry: decodingMode === "full" //this option is unnecessary but including for clarity
          }
        ));
      }
      catch(error) {
        if(error instanceof StopDecodingError && error.allowRetry && decodingMode === "full") {
          //if a retry happens, we've got to do several things in order to switch to ABI mode:
          //1. mark that we're switching to ABI mode;
          decodingMode = "abi";
          //2. abify all previously decoded values;
          decodedArguments = decodedArguments.map(argumentDecoding =>
            ({ ...argumentDecoding,
              value: CodecUtils.abifyResult(argumentDecoding.value, info.userDefinedTypes)
            })
          );
          //3. retry this particular decode in ABI mode.
          try {
            value = <Values.Result> (yield* decode(
              CodecUtils.abifyType(argumentAllocation.type), //type is now abified!
              argumentAllocation.pointer,
              info,
              {
                strictAbiMode: true, //turns on STRICT MODE to cause more errors to be thrown
                //retries no longer allowed, not that this has an effect
              }
            ));
          }
          catch(_) {
            //if an error occurred on the retry, this isn't a valid decoding!
            debug("rejected due to exception on retry");
            continue allocationAttempts;
          }
          //4. the remaining parameters will then automatically be decoded in ABI mode due to (1),
          //so we don't need to do anything special there.
        }
        else {
          //if any other sort of error occurred, this isn't a valid decoding!
          debug("rejected due to exception on first try: %O", error);
          continue allocationAttempts;
        }
      }
      const name = argumentAllocation.name;
      const indexed = argumentAllocation.pointer.location === "eventtopic";
      decodedArguments.push(
        name //deliberate general falsiness test
          ? { name, indexed, value }
          : { indexed, value }
      );
    }
    //OK, so, having decoded the result, the question is: does it reencode to the original?
    //first, we have to filter out the indexed arguments, and also get rid of the name information
    const nonIndexedValues = decodedArguments
      .filter(argument => !argument.indexed)
      .map(argument => argument.value);
    //now, we can encode!
    const reEncodedData = encodeTupleAbi(nonIndexedValues, info.allocations.abi);
    //are they equal?
    const encodedData = info.state.eventdata; //again, not great to read this directly, but oh well
    if(CodecUtils.EVM.equalData(encodedData, reEncodedData)) {
      debug("allocation accepted!");
      if(allocation.abi.anonymous) {
        decodings.push({
          kind: "anonymous",
          class: contractType,
          abi: allocation.abi,
          arguments: decodedArguments,
          decodingMode
        });
      }
      else {
        decodings.push({
          kind: "event",
          class: contractType,
          abi: allocation.abi,
          arguments: decodedArguments,
          selector,
          decodingMode
        });
      }
    }
    //otherwise, just move on
  }
  return decodings;
}
