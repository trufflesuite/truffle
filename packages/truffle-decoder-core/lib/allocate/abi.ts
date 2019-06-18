import debugModule from "debug";
const debug = debugModule("decoder-core:allocate:abi");

import * as Pointer from "../types/pointer";
import * as Allocations from "../types/allocation";
import { AstDefinition, AstReferences } from "truffle-decode-utils";
import * as DecodeUtils from "truffle-decode-utils";
import partition from "lodash.partition";

import { AbiCoder } from "web3-eth-abi";
import { AbiItem, AbiInput } from "web3-utils";
const abiCoder = new AbiCoder();

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

  let memberAllocations: Allocations.AbiMemberAllocation[] = [];

  for(const member of definitions)
  {
    let length: number;
    let dynamicMember: boolean;
    [length, dynamicMember, allocations] = abiSizeAndAllocate(member, referenceDeclarations, allocations);

    //vomit on illegal types in calldata -- note the short-circuit!
    if(length === undefined) {
      allocations[parentNode.id] = null;
      return allocations;
    }

    let pointer: Pointer.AbiPointer = {
      location: "abi",
      start,
      length,
    };

    memberAllocations.push({
      definition: member,
      pointer
    });

    start += length;
    dynamic = dynamic || dynamicMember;
  }

  allocations[parentNode.id] = {
    definition: parentNode,
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
        if(length === 0) {
          //arrays of length 0 are static regardless of base type
          return [0, false, existingAllocations];
        }
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
      return dataType.kind === "dynamic" || (dataType.length.gtn(0) && isTypeDynamic(dataType.baseType, allocations));
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
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations,
  constructorContext?: DecodeUtils.Contexts.DecoderContext
): Allocations.CalldataAllocation {
  const linearizedBaseContracts = referenceDeclarations[contractId].linearizedBaseContracts;
  //first: determine the corresponding function node
  //(simultaneously: determine the offset)
  let node: AstDefinition;
  let offset: number;
  switch(abiEntry.type) {
    case "constructor":
      let rawLength = constructorContext.binary.length;
      offset = (rawLength - 2)/2; //number of bytes in 0x-prefixed bytestring
      //for a constructor, we only want to search the particular contract, which
      let contractNode = referenceDeclarations[contractId];
      node = contractNode.nodes.find(
        functionNode => DecodeUtils.Contexts.matchesAbi(
          abiEntry, functionNode, referenceDeclarations
        )
      );
      //TODO: handle case if node undefined
      break;
    case "function":
      offset = DecodeUtils.EVM.SELECTOR_SIZE;
      //search through base contracts, from most derived (right) to most base (left)
      node = linearizedBaseContracts.reduceRight(
        (foundNode, baseContractId) => foundNode || referenceDeclarations[baseContractId].nodes.find(
          functionNode => DecodeUtils.Contexts.matchesAbi(
            abiEntry, functionNode, referenceDeclarations
          )
        ),
        undefined
      );
      //TODO: handle case if node undefined
      break;
  }
  //now: perform the allocation!
  const abiAllocation = allocateMembers(node, node.parameters.parameters, referenceDeclarations, abiAllocations, offset)[node.id];
  //finally: transform it appropriately
  let argumentsAllocation = [];
  for(const member of abiAllocation.members) {
    const position = node.parameters.parameters.findIndex(
      (parameter: AstDefinition) => parameter.id === member.definition.id
    );
    argumentsAllocation[position] = {
      definition: member.definition,
      pointer: {
        location: "calldata" as "calldata",
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
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations
): Allocations.EventAllocation {
  const linearizedBaseContracts = referenceDeclarations[contractId].linearizedBaseContracts;
  //first: determine the corresponding event node
  //search through base contracts, from most derived (right) to most base (left)
  const node: AstDefinition = linearizedBaseContracts.reduceRight(
    (foundNode, baseContractId) => foundNode || referenceDeclarations[baseContractId].nodes.find(
      eventNode => DecodeUtils.Contexts.matchesAbi(
        abiEntry, eventNode, referenceDeclarations
      )
    ),
    undefined
  );
  //now: split the list of parameters into indexed and non-indexed
  //but first attach positions so we can reconstruct the list later
  const rawParameters = node.parameters.parameters;
  const [indexed, nonIndexed] = rawParameters.partition((parameter: AstDefinition) => parameter.indexed);
  //now: perform the allocation for the non-indexed parameters!
  const abiAllocation = allocateMembers(node, nonIndexed, referenceDeclarations, abiAllocations)[node.id];
  //now: transform it appropriately
  let argumentsAllocation = [];
  for(const member of abiAllocation.members) {
    const position = rawParameters.findIndex(
      (parameter: AstDefinition) => parameter.id === member.definition.id
    );
    argumentsAllocation[position] = {
      definition: member.definition,
      pointer: {
        location: "eventdata" as "eventdata",
        start: member.pointer.start,
        length: member.pointer.length
      }
    };
  }
  //finally: add in the indexed parameters...
  for(let positionInIndexed = 0; positionInIndexed < indexed.length; positionInIndexed++) {
    const node = indexed[positionInIndexed];
    const position = rawParameters.findIndex(
      (parameter: AstDefinition) => parameter.id === node.id
    );
    argumentsAllocation[position] = {
      definition: node,
      pointer: {
        location: "eventtopic" as "eventtopic",
        topic: positionInIndexed + 1 //signature takes up topic 0, so we skip that, hence +1
      }
    };
  }
  //...and return
  return {
    definition: abiAllocation.definition,
    contractId,
    arguments: argumentsAllocation
  };
}

//NOTE: this is for a single contract!
//run multiple times to handle multiple contracts
export function getCalldataAllocations(
  abi: AbiItem[],
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations,
  constructorContext: DecodeUtils.Contexts.DecoderContext
): Allocations.CalldataContractAllocation {
  let allocations: Allocations.CalldataContractAllocation;
  for(let abiEntry of abi) {
    if(abiEntry.type === "constructor") {
      allocations.constructorAllocation = allocateCalldata(
        abiEntry,
        contractId,
        referenceDeclarations,
        abiAllocations,
        constructorContext
      );
    }
    else if(abiEntry.type === "function") {
      allocations.functionAllocations[abiCoder.encodeFunctionSignature(abiEntry)] =
        allocateCalldata(
          abiEntry,
          contractId,
          referenceDeclarations,
          abiAllocations,
          constructorContext
        );
    }
    //skip over fallback and event
  }
  //now: did we allocate a constructor? if not, allocate a default one
  if(allocations.constructorAllocation === undefined) {
    allocations.constructorAllocation = defaultConstructorAllocation(constructorContext);
  }
  return allocations;
}

function defaultConstructorAllocation(constructorContext: DecodeUtils.Contexts.DecoderContext) {
  let rawLength = constructorContext.binary.length;
  let offset = (rawLength - 2)/2; //number of bytes in 0x-prefixed bytestring
  return {
    offset,
    arguments: [] as Allocations.CalldataArgumentAllocation[]
  };
}

//NOTE: this is for a single contract!
//run multiple times to handle multiple contracts
export function getEventAllocations(
  abi: AbiItem[],
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations
): Allocations.EventAllocations {
  return Object.assign({}, ...abi
    .filter(abiEntry => abiEntry.type === "event")
    .map(abiEntry =>
      ({ [abiCoder.encodeEventSignature(abiEntry)] :
        allocateEvent(abiEntry, contractId, referenceDeclarations, abiAllocations)
      })
    )
  );
}
