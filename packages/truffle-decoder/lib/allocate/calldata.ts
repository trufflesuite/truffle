import debugModule from "debug";
const debug = debugModule("decoder:allocate:calldata");

import { CalldataPointer } from "../types/pointer";
import { CalldataAllocations, CalldataAllocation, CalldataMemberAllocations } from "../types/allocation";
import { AstDefinition, AstReferences } from "truffle-decode-utils";
import * as DecodeUtils from "truffle-decode-utils";

export function getCalldataAllocations(referenceDeclarations: AstReferences): CalldataAllocations {
  let allocations: CalldataAllocations = {};
  for(const node of Object.values(referenceDeclarations)) {
    if(node.nodeType === "StructDefinition") {
      allocations = allocateStruct(node, referenceDeclarations, allocations);
    }
  }
  return allocations;
}

//note: we will still allocate circular structs, even though they're not allowed in calldata, because it's
//not worth the effort to detect them.  However on mappings or internal functions, we'll vomit (allocate null)
function allocateStruct(definition: AstDefinition, referenceDeclarations: AstReferences, existingAllocations: CalldataAllocations): CalldataAllocations {
  let start: number = 0;
  let dynamic: boolean = false;

  //don't allocate things that have already been allocated
  if(definition.id in existingAllocations) {
    return existingAllocations;
  }

  let allocations = {...existingAllocations}; //otherwise, we'll be adding to this, so we better clone

  let memberAllocations: CalldataMemberAllocations = {}

  for(const member of definition.members)
  {
    let length: number;
    let dynamicMember: boolean;
    [length, dynamicMember, allocations] = calldataSizeAndAllocate(member, referenceDeclarations, allocations);

    //vomit on illegal types in calldata -- note the short-circuit!
    if(length === undefined) {
      allocations[definition.id] = null;
      return allocations;
    }

    let pointer: CalldataPointer = {
      calldata: {
        start,
        length
      }
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
export function calldataSize(definition: AstDefinition, referenceDeclarations?: AstReferences, allocations?: CalldataAllocations): [number | undefined, boolean | undefined] {
  let [size, dynamic] = calldataSizeAndAllocate(definition, referenceDeclarations, allocations); //throw away allocations
  return [size, dynamic];
}

//first return value is the actual size.
//second return value is whether the type is dynamic
//both will be undefined if type is a mapping or internal function
//third return value is resulting allocations, INCLUDING the ones passed in
function calldataSizeAndAllocate(definition: AstDefinition, referenceDeclarations?: AstReferences, existingAllocations?: CalldataAllocations): [number | undefined, boolean | undefined, CalldataAllocations] {
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
        const [baseSize, dynamic, allocations] = calldataSizeAndAllocate(baseDefinition, referenceDeclarations, existingAllocations);
        return [length * baseSize, dynamic, allocations];
      }
    }

    case "struct": {
      const referenceId: number = DecodeUtils.Definition.typeId(definition);
      let allocations: CalldataAllocations = existingAllocations;
      let allocation: CalldataAllocation | null | undefined = allocations[referenceId];
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
      //if it is null, this type doesn't go in calldata
      else {
        return [undefined, undefined, allocations];
      }
    }
  }
}
