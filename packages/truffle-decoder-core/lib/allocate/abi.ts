import debugModule from "debug";
const debug = debugModule("decoder-core:allocate:abi");

import * as Pointer from "../types/pointer";
import * as Allocations from "../types/allocation";
import { AstDefinition, AstReferences } from "truffle-decode-utils";
import * as DecodeUtils from "truffle-decode-utils";
import partition from "lodash.partition";

export function getAbiAllocations(referenceDeclarations: AstReferences): Allocations.AbiAllocations {
  let allocations: Allocations.AbiAllocations = {};
  for(const node of Object.values(referenceDeclarations)) {
    if(node.nodeType === "StructDefinition") {
      allocations = allocateStruct(node, referenceDeclarations, allocations);
    }
  }
  return allocations;
}

function allocateStruct(structDefinition: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: Allocations.AbiAllocations): Allocations.AbiAllocations {
  return allocateMembers(structDefinition, structDefinition.members, referenceDeclarations, existingAllocations);
}

//note: we will still allocate circular structs, even though they're not allowed in the abi, because it's
//not worth the effort to detect them.  However on mappings or internal functions, we'll vomit (allocate null)
function allocateMembers(parentNode: AstDefinition, definitions: AstDefinition[], referenceDeclarations: AstReferences, existingAllocations: Allocations.AbiAllocations, start: number = 0): Allocations.AbiAllocations {
  let dynamic: boolean = false;
  //note that we will mutate the start argument also!

  //don't allocate things that have already been allocated
  if(parentNode.id in existingAllocations) {
    return existingAllocations;
  }

  let allocations = {...existingAllocations}; //otherwise, we'll be adding to this, so we better clone

  let memberAllocations: Allocations.AbiMemberAllocations = {}

  for(const member of definitions)
  {
    let length: number;
    let dynamicMember: boolean;
    [length, dynamicMember, allocations] = abiSizeAndAllocate(member, referenceDeclarations, allocations);

    //vomit on illegal types in calldata -- note the short-circuit!
    if(length === undefined) {
      allocations[definition.id] = null;
      return allocations;
    }

    let pointer: Pointer.AbiPointer = {
      location: "abi",
      start,
      length,
    };

    memberAllocations[member.id] = {
      definition: member,
      pointer
    }

    start += length;
    dynamic = dynamic || dynamicMember;
  }

  allocations[definition.id] = {
    definition,
    members: memberAllocations,
    length: dynamic ? DecodeUtils.EVM.WORD_SIZE : start,
    dynamic
  };

  return allocations;
}

//NOTE: This wrapper function is for use by the decoder ONLY, after allocation is done.
//The allocator should (and does) instead use a direct call to storageSizeAndAllocate,
//not to the wrapper, because it may need the allocations returned.
//the first return value is the length (in bytes); the second is whether the type is dynamic
export function abiSize(definition: AstDefinition, referenceDeclarations?: AstReferences, allocations?: Allocations.AbiAllocations): [number | undefined, boolean | undefined] {
  let [size, dynamic] = abiSizeAndAllocate(definition, referenceDeclarations, allocations); //throw away allocations
  return [size, dynamic];
}

//first return value is the actual size.
//second return value is whether the type is dynamic
//both will be undefined if type is a mapping or internal function
//third return value is resulting allocations, INCLUDING the ones passed in
//TODO: add error handling
function abiSizeAndAllocate(definition: AstDefinition, referenceDeclarations?: AstReferences, existingAllocations?: Allocations.AbiAllocations): [number | undefined, boolean | undefined, Allocations.AbiAllocations] {
  switch (DecodeUtils.Definition.typeClass(definition)) {
    case "bool":
    case "address":
    case "contract":
    case "int":
    case "uint":
    case "fixed":
    case "ufixed":
    case "enum":
      return [DecodeUtils.EVM.WORD_SIZE, false, existingAllocations];

    case "string":
      return [DecodeUtils.EVM.WORD_SIZE, true, existingAllocations];

    case "bytes":
      return [DecodeUtils.EVM.WORD_SIZE, DecodeUtils.Definition.specifiedSize(definition) == null,
        existingAllocations];

    case "mapping":
      return [undefined, undefined, existingAllocations];

    case "function":
      switch (DecodeUtils.Definition.visibility(definition)) {
        case "external":
          return [DecodeUtils.EVM.WORD_SIZE, false, existingAllocations];
        case "internal":
          return [undefined, undefined, existingAllocations];
      }

    case "array": {
      if(DecodeUtils.Definition.isDynamicArray(definition)) {
        return [DecodeUtils.EVM.WORD_SIZE, true, existingAllocations];
      }
      else {
        //static array case
        const length: number = DecodeUtils.Definition.staticLength(definition);
        const baseDefinition: AstDefinition = definition.baseType || definition.typeName.baseType;
        const [baseSize, dynamic, allocations] = abiSizeAndAllocate(baseDefinition, referenceDeclarations, existingAllocations);
        return [length * baseSize, dynamic, allocations];
      }
    }

    case "struct": {
      const referenceId: number = DecodeUtils.Definition.typeId(definition);
      let allocations: Allocations.AbiAllocations = existingAllocations;
      let allocation: Allocations.AbiAllocation | null | undefined = allocations[referenceId];
      if(allocation === undefined) {
        //if we don't find an allocation, we'll have to do the allocation ourselves
        const referenceDeclaration: AstDefinition = referenceDeclarations[referenceId];
        allocations = allocateStruct(referenceDeclaration, referenceDeclarations, existingAllocations);
        allocation = allocations[referenceId];
      }
      //having found our allocation, if it's not null, we can just look up its size and dynamicity
      if(allocation !== null) {
        return [allocation.length, allocation.dynamic, allocations];
      }
      //if it is null, this type doesn't go in the abi
      else {
        return [undefined, undefined, allocations];
      }
    }
  }
}

//like abiSize, but for a Type object; also assumes you've already done allocation
//(note: function for dynamic is separate, see below)
//also, does not attempt to handle types that don't occur in calldata
export function abiSizeForType(dataType: DecodeUtils.Types.Type, allocations: Allocations.AbiAllocations): number {
  switch(dataType.typeClass) {
    case "array":
      switch(dataType.kind) {
        case "dynamic":
          return DecodeUtils.EVM.WORD_SIZE;
        case "static":
          const length = dataType.length.toNumber(); //if this is too big, we have a problem!
          const baseSize = abiSizeForType(dataType.baseType, allocations);
          return length * baseSize;
      }
    case "struct":
      const allocation = allocations[dataType.id];
      if(!allocation) {
        throw new DecodeUtils.Values.DecodingError(
          new DecodeUtils.Values.UserDefinedTypeNotFoundError(dataType)
        );
      }
      return allocation.length;
    default:
      return DecodeUtils.EVM.WORD_SIZE;
  }
}

//again, this function does not attempt to handle types that don't occur in the abi
export function isTypeDynamic(dataType: DecodeUtils.Types.Type, allocations: Allocations.AbiAllocations): boolean {
  switch(dataType.typeClass) {
    case "string":
      return true;
    case "bytes":
      return dataType.kind === "dynamic";
    case "array":
      return dataType.kind === "dynamic" || isTypeDynamic(dataType.baseType, allocations);
    case "struct":
      const allocation = allocations[dataType.id];
      if(!allocation) {
        throw new DecodeUtils.Values.DecodingError(
          new DecodeUtils.Values.UserDefinedTypeNotFoundError(dataType)
        );
      }
      return allocation.dynamic;
    default:
      return false;
  }
}

//allocates an external call
//NOTE: returns just a single allocation; assumes primary allocation is already complete!
//TODO add error-handling
//TODO: check accesses to abi & node members
function allocateCalldata(
  abiEntry: AbiItem,
  linearizedBaseContracts: number[],
  referenceDeclarations: AstReferences,
  abiAllocations: AbiAllocations,
  constructorContext?: DecodeUtils.Contexts.DecoderContext
): Allocations.CalldataAllocation {
  //first: determine the corresponding function node
  let node: AstDefinition;
  //base contracts are listed from most derived to most base, so we
  //have to reverse before processing, but reverse() is in place, so we
  //clone with slice first
  let linearizedBaseContractsFromBase: number[] = contract.linearizedBaseContracts.slice().reverse();
  for(const contractId of linearizedBaseContractsFromBase) {
    node = referenceDeclarations[contractId].nodes.find(
      functionNode => DecodeUtils.Contexts.matchesAbi(
        abiEntry, functionNode, referenceDeclarations
      )
    );
    if(node !== undefined) {
      break;
    }
  }
  if(node === undefined) {
    //before we declare this an error-case... maybe it's just an implicit constructor?
    //and we can return an empty allocation?
    if(isNoArgumentConstructor(abiEntry)) {
      let rawLength = constructorContext.binary.length;
      offset = (rawLength - 2)/2; //number of bytes in 0x-prefixed bytestring
      return {
        offset,
        arguments: {}
      };
    }
    else {
     //TODO: error-handling
    }
  }
  //now: determine the offset
  let offset: number;
  switch(abiEntry.type) {
    case "function":
      offset = DecodeUtils.EVM.SELECTOR_SIZE;
      break;
    case "constructor":
      let rawLength = constructorContext.binary.length;
      offset = (rawLength - 2)/2; //number of bytes in 0x-prefixed bytestring
      break;
    //we'll ignore event and fallback, which are not applicable here
  }
  //now: perform the allocation!
  const abiAllocation = allocateMembers(node, node.parameters.parameters, referenceDeclarations, abiAllocations, offset)[node.id];
  //finally: transform it appropriately
  let argumentsAllocation = [];
  for(const member of abiAllocation.members) {
    const position = rawParameters.findIndex(
      parameter => parameter.id === member.definition.id
    );
    argumentsAllocation[position] = {
      definition: member.definition,
      pointer: {
        location: "calldata",
        start: member.pointer.start,
        length: member.pointer.length
      }
    };
  }
  return {
    definition: abiAllocation.definition,
    offset,
    arguments: argumentsAllocation
  };
}

//allocates an event
//NOTE: returns just a single allocation; assumes primary allocation is already complete!
//TODO add error-handling
//TODO: check accesses to abi & node members
function allocateEvent(
  abiEntry: AbiItem,
  referenceDeclarations: AstReferences,
  linearizedBaseContracts: number[],
  abiAllocations: AbiAllocations
): Allocations.EventAllocation {
  //first: determine the corresponding function node
  let node: AstDefinition;
  //base contracts are listed from most derived to most base, so we
  //have to reverse before processing, but reverse() is in place, so we
  //clone with slice first
  const linearizedBaseContractsFromBase: number[] = contract.linearizedBaseContracts.slice().reverse();
  for(const contractId of linearizedBaseContractsFromBase) {
    node = referenceDeclarations[contractId].nodes.find(
      functionNode => DecodeUtils.Contexts.matchesAbi(
        abiEntry, functionNode, referenceDeclarations
      )
    );
    if(node !== undefined) {
      break;
    }
  }
  //now: split the list of parameters into indexed and non-indexed
  //but first attach positions so we can reconstruct the list later
  const rawParameters = node.parameters.parameters;
  const [indexed, nonIndexed] = rawParameters.partition(parameter => parameter.indexed);
  //now: perform the allocation for the non-indexed parameters!
  const abiAllocation = allocateMembers(node, nonIndexed, referenceDeclarations, abiAllocations)[node.id];
  //now: transform it appropriately
  let argumentsAllocation = [];
  for(const member of abiAllocation.members) {
    const position = rawParameters.findIndex(
      parameter => parameter.id === member.definition.id
    );
    argumentsAllocation[position] = {
      definition: member.definition,
      pointer: {
        location: "eventdata",
        start: member.pointer.start,
        length: member.pointer.length
      }
    };
  }
  //finally: add in the indexed parameters...
  for(let positionInIndexed = 0; positionInIndexed < indexed.length; positionInIndexed++) {
    const node = indexed[positionInIndexed];
    const position = rawParameters.findIndex(
      parameter => parameter.id === node.id
    );
    argumentsAllocation[position] = {
      definition: node,
      pointer: {
        location: "eventtopic",
        topic: positionInIndexed + 1 //signature takes up topic 0, so we skip that, hence +1
      }
    };
  }
  //...and return
  return {
    definition: abiAllocation.definition,
    arguments: argumentsAllocation
  };
}

//NOTE: this is for a single contract!
//run multiple times to handle multiple contracts
export function getCalldataAllocations(
  abi: Abi,
  referenceDeclarations: AstReferences,
  linearizedBaseContracts: number[],
  abiAllocations: Allocations.AbiAllocations,
  constructorContext: DecoderContext
): Allocations.CalldataContractAllocations {
  return Object.assign({}, ...abi
    .filter(abiEntry => abiEntry.type === "function" || abiEntry.type === "constructor")
    .map(abiEntry =>
      abiEntry.type === "constructor"
      ? { constructorAllocation: allocateCalldata(abiEntry, referenceDeclarations, linearizedBaseContracts, abiAllocations, constructorContext) }
      : { [abiCoder.encodeFunctionSignature(abiEntry)] :
        allocateCalldata(abiEntry, referenceDeclarations, linearizedBaseContracts, abiAllocations)
      };
    )
  );
}

//NOTE: this is for a single contract!
//run multiple times to handle multiple contracts
export function getEventAllocations(abi: Abi, referenceDeclarations: AstReferences, linearizedBaseContracts: number[], abiAllocations: Allocations.AbiAllocations): Allocations.EventContractAllocations {
  return Object.assign({}, ...abi
    .filter(abiEntry => abiEntry.type === "event")
    .map(abiEntry =>
      ({ [abiCoder.encodeEventSignature(abiEntry)] :
        allocateEvent(abiEntry, referenceDeclarations, linearizedBaseContracts, abiAllocations)
      })
    )
  );
}
