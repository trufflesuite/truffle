import debugModule from "debug";
const debug = debugModule("codec:allocate:abi");

import * as Pointer from "../types/pointer";
import * as Allocations from "../types/allocation";
import { AstDefinition, AstReferences, AbiUtils } from "truffle-codec-utils";
import * as CodecUtils from "truffle-codec-utils";
import { UnknownUserDefinedTypeError } from "truffle-codec-utils";
import { UnknownBaseContractIdError, NoDefinitionFoundForABIEntryError } from "../types/errors";
import partition from "lodash.partition";

interface AbiAllocationInfo {
  size?: number; //left out for types that don't go in the abi
  dynamic?: boolean; //similarly
  allocations: Allocations.AbiAllocations;
}

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
    ({size: length, dynamic: dynamicMember, allocations} = abiSizeAndAllocate(member, referenceDeclarations, allocations));

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
    length: dynamic ? CodecUtils.EVM.WORD_SIZE : start,
    dynamic
  };

  return allocations;
}

//first return value is the actual size.
//second return value is whether the type is dynamic
//both will be undefined if type is a mapping or internal function
//third return value is resulting allocations, INCLUDING the ones passed in
function abiSizeAndAllocate(definition: AstDefinition, referenceDeclarations?: AstReferences, existingAllocations?: Allocations.AbiAllocations): AbiAllocationInfo {
  switch (CodecUtils.Definition.typeClass(definition)) {
    case "bool":
    case "address":
    case "contract":
    case "int":
    case "uint":
    case "fixed":
    case "ufixed":
    case "enum":
      return {
        size: CodecUtils.EVM.WORD_SIZE,
        dynamic: false,
        allocations: existingAllocations
      };

    case "string":
      return {
        size: CodecUtils.EVM.WORD_SIZE,
        dynamic: true,
        allocations: existingAllocations
      };

    case "bytes":
      return {
        size: CodecUtils.EVM.WORD_SIZE,
        dynamic: CodecUtils.Definition.specifiedSize(definition) == null,
        allocations: existingAllocations
      };

    case "mapping":
      return {
        allocations: existingAllocations
      };

    case "function":
      switch (CodecUtils.Definition.visibility(definition)) {
        case "external":
          return {
            size: CodecUtils.EVM.WORD_SIZE,
            dynamic: false,
            allocations: existingAllocations
          };
        case "internal":
          return {
            allocations: existingAllocations
          };
      }

    case "array": {
      if(CodecUtils.Definition.isDynamicArray(definition)) {
        return {
          size: CodecUtils.EVM.WORD_SIZE,
          dynamic: true,
          allocations: existingAllocations
        };
      }
      else {
        //static array case
        const length: number = CodecUtils.Definition.staticLength(definition);
        if(length === 0) {
          //arrays of length 0 are static regardless of base type
          return {
            size: 0,
            dynamic: false,
            allocations: existingAllocations
          };
        }
        const baseDefinition: AstDefinition = definition.baseType || definition.typeName.baseType;
        const {size: baseSize, dynamic, allocations} = abiSizeAndAllocate(baseDefinition, referenceDeclarations, existingAllocations);
        return {
          size: length * baseSize,
          dynamic,
          allocations
        };
      }
    }

    case "struct": {
      const referenceId: number = CodecUtils.Definition.typeId(definition);
      let allocations: Allocations.AbiAllocations = existingAllocations;
      let allocation: Allocations.AbiAllocation | null | undefined = allocations[referenceId];
      if(allocation === undefined) {
        //if we don't find an allocation, we'll have to do the allocation ourselves
        const referenceDeclaration: AstDefinition = referenceDeclarations[referenceId];
        if(referenceDeclaration === undefined) {
          let typeString = CodecUtils.Definition.typeString(definition);
          throw new UnknownUserDefinedTypeError(referenceId, typeString);
        }
        allocations = allocateStruct(referenceDeclaration, referenceDeclarations, existingAllocations);
        allocation = allocations[referenceId];
      }
      //having found our allocation, if it's not null, we can just look up its size and dynamicity
      if(allocation !== null) {
        return {
          size: allocation.length,
          dynamic: allocation.dynamic,
          allocations
        };
      }
      //if it is null, this type doesn't go in the abi
      else {
        return {
          allocations
        };
      }
    }
  }
}

//like abiSize, but for a Type object; also assumes you've already done allocation
//(note: function for dynamic is separate, see below)
//also, does not attempt to handle types that don't occur in calldata
export function abiSizeForType(dataType: CodecUtils.Types.Type, allocations?: Allocations.AbiAllocations): number {
  switch(dataType.typeClass) {
    case "array":
      switch(dataType.kind) {
        case "dynamic":
          return CodecUtils.EVM.WORD_SIZE;
        case "static":
          const length = dataType.length.toNumber(); //if this is too big, we have a problem!
          const baseSize = abiSizeForType(dataType.baseType, allocations);
          return length * baseSize;
      }
    case "struct":
      const allocation = allocations[parseInt(dataType.id)];
      if(!allocation) {
        throw new CodecUtils.Errors.DecodingError(
          {
            kind: "UserDefinedTypeNotFoundError",
            type: dataType
          }
        );
      }
      return allocation.length;
    default:
      return CodecUtils.EVM.WORD_SIZE;
  }
}

//again, this function does not attempt to handle types that don't occur in the abi
export function isTypeDynamic(dataType: CodecUtils.Types.Type, allocations?: Allocations.AbiAllocations): boolean {
  switch(dataType.typeClass) {
    case "string":
      return true;
    case "bytes":
      return dataType.kind === "dynamic";
    case "array":
      return dataType.kind === "dynamic" || (dataType.length.gtn(0) && isTypeDynamic(dataType.baseType, allocations));
    case "struct":
      const allocation = allocations[parseInt(dataType.id)];
      if(!allocation) {
        throw new CodecUtils.Errors.DecodingError(
          {
            kind: "UserDefinedTypeNotFoundError",
            type: dataType
          }
        );
      }
      return allocation.dynamic;
    default:
      return false;
  }
}

//allocates an external call
//NOTE: returns just a single allocation; assumes primary allocation is already complete!
function allocateCalldata(
  abiEntry: AbiUtils.FunctionAbiEntry | AbiUtils.ConstructorAbiEntry,
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations,
  constructorContext?: CodecUtils.Contexts.DecoderContext
): Allocations.CalldataAllocation {
  const contractNode = referenceDeclarations[contractId];
  const linearizedBaseContracts = contractNode.linearizedBaseContracts;
  //first: determine the corresponding function node
  //(simultaneously: determine the offset)
  let node: AstDefinition;
  let offset: number;
  switch(abiEntry.type) {
    case "constructor":
      let rawLength = constructorContext.binary.length;
      offset = (rawLength - 2)/2; //number of bytes in 0x-prefixed bytestring
      //for a constructor, we only want to search the particular contract
      node = contractNode.nodes.find(
        functionNode => AbiUtils.definitionMatchesAbi(
          //note this needn't actually be a function node, but then it will
          //return false (well, unless it's a getter node!)
          abiEntry, functionNode, referenceDeclarations
        )
      );
      if(node === undefined) {
        //if we can't find it, just throw
        throw new NoDefinitionFoundForABIEntryError(abiEntry, [contractId]);
      }
      break;
    case "function":
      offset = CodecUtils.EVM.SELECTOR_SIZE;
      //search through base contracts, from most derived (right) to most base (left)
      node = linearizedBaseContracts.reduceRight(
        (foundNode: AstDefinition, baseContractId: number) => {
          if(foundNode) {
            return foundNode //once we've found something, we don't need to keep looking
          };
          let baseContractNode = referenceDeclarations[baseContractId];
          if(baseContractNode === undefined) {
            throw new UnknownBaseContractIdError(contractNode.id, contractNode.name, contractNode.contractKind, baseContractId);
          }
          return baseContractNode.nodes.find( //may be undefined! that's OK!
            functionNode => AbiUtils.definitionMatchesAbi(
              abiEntry, functionNode, referenceDeclarations
            )
          );
        },
        undefined //start with no node found
      );
      if(node === undefined) {
        //if we can't find it, just throw
        //reverse the list (cloning first with slice) so that they're actually in the order searched
        throw new NoDefinitionFoundForABIEntryError(abiEntry, linearizedBaseContracts.slice().reverse());
      }
      break;
  }
  //now: perform the allocation! however this will depend on whether
  //we're looking at a normal function or a getter
  let parameters: AstDefinition[];
  switch(node.nodeType) {
    case "FunctionDefinition":
      parameters = node.parameters.parameters;
      break;
    case "VariableDeclaration":
      //getter case
      parameters = CodecUtils.Definition.getterInputs(node);
      break;
  }
  const abiAllocation = allocateMembers(node, parameters, referenceDeclarations, abiAllocations, offset)[node.id];
  //finally: transform it appropriately
  let argumentsAllocation = [];
  for(const member of abiAllocation.members) {
    const position = parameters.findIndex(
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
function allocateEvent(
  abiEntry: AbiUtils.EventAbiEntry,
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations
): Allocations.EventAllocation {
  const contractNode = referenceDeclarations[contractId];
  const linearizedBaseContracts = contractNode.linearizedBaseContracts;
  //first: determine the corresponding event node
  //search through base contracts, from most derived (right) to most base (left)
  let node: AstDefinition;
  node = linearizedBaseContracts.reduceRight(
    (foundNode: AstDefinition, baseContractId: number) => {
      if(foundNode) {
        return foundNode //once we've found something, we don't need to keep looking
      };
      let baseContractNode = referenceDeclarations[baseContractId];
      if(baseContractNode === undefined) {
        throw new UnknownBaseContractIdError(contractNode.id, contractNode.name, contractNode.contractKind, baseContractId);
      }
      return baseContractNode.nodes.find( //may be undefined! that's OK!
        eventNode => AbiUtils.definitionMatchesAbi(
          //note this needn't actually be a event node, but then it will return false
          abiEntry, eventNode, referenceDeclarations
        )
      );
    },
    undefined //start with no node found
  );
  if(node === undefined) {
    //if we can't find it, just throw
    //reverse the list (cloning first with slice) so that they're actually in the order searched
    throw new NoDefinitionFoundForABIEntryError(abiEntry, linearizedBaseContracts.slice().reverse());
  }
  //now: split the list of parameters into indexed and non-indexed
  //but first attach positions so we can reconstruct the list later
  const rawParameters = node.parameters.parameters;
  const [indexed, nonIndexed] = partition(rawParameters, (parameter: AstDefinition) => parameter.indexed);
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
  let currentTopic = node.anonymous ? 0 : 1; //if not anonymous, selector takes up topic 0
  for(const parameterNode of indexed) {
    const position = rawParameters.findIndex(
      (parameter: AstDefinition) => parameter.id === parameterNode.id
    );
    argumentsAllocation[position] = {
      definition: parameterNode,
      pointer: {
        location: "eventtopic" as "eventtopic",
        topic: currentTopic
      }
    };
    currentTopic++;
  }
  //...and return
  return {
    definition: abiAllocation.definition,
    contractId,
    arguments: argumentsAllocation
  };
}

function getCalldataAllocationsForContract(
  abi: AbiUtils.Abi,
  contractId: number,
  constructorContext: CodecUtils.Contexts.DecoderContext,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations
): Allocations.CalldataContractAllocation {
  let allocations: Allocations.CalldataContractAllocation = {
    constructorAllocation: defaultConstructorAllocation(constructorContext), //will be overridden if abi has a constructor
    //(if it doesn't then it will remain as default)
    functionAllocations: {}
  }
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
      allocations.functionAllocations[AbiUtils.abiSelector(abiEntry)] =
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
  return allocations;
}

function defaultConstructorAllocation(constructorContext: CodecUtils.Contexts.DecoderContext) {
  let rawLength = constructorContext.binary.length;
  let offset = (rawLength - 2)/2; //number of bytes in 0x-prefixed bytestring
  return {
    offset,
    arguments: [] as Allocations.CalldataArgumentAllocation[]
  };
}

//note: contract allocation info should include constructor context
export function getCalldataAllocations(contracts: Allocations.ContractAllocationInfo[], referenceDeclarations: AstReferences, abiAllocations: Allocations.AbiAllocations): Allocations.CalldataAllocations {
  return Object.assign({}, ...contracts.map(
    ({abi, id, constructorContext}) => ({
      [id]: getCalldataAllocationsForContract(
        abi, id, constructorContext, referenceDeclarations, abiAllocations
      )
    })
  ));
}

function getEventAllocationsForContract(
  abi: AbiUtils.Abi,
  contractId: number,
  referenceDeclarations: AstReferences,
  abiAllocations: Allocations.AbiAllocations
): Allocations.EventAllocationTemporary[] {
  return abi.filter(
    (abiEntry: AbiUtils.AbiEntry) => abiEntry.type === "event"
  ).map(
    (abiEntry: AbiUtils.EventAbiEntry) =>
      abiEntry.anonymous
      ? {
        topics: AbiUtils.topicsCount(abiEntry),
        allocation: allocateEvent(abiEntry, contractId, referenceDeclarations, abiAllocations)
      }
      : {
        selector: AbiUtils.abiSelector(abiEntry),
        topics: AbiUtils.topicsCount(abiEntry),
        allocation: allocateEvent(abiEntry, contractId, referenceDeclarations, abiAllocations)
      }
  );
}

//note: constructor context is ignored by this function; no need to pass it in
export function getEventAllocations(contracts: Allocations.ContractAllocationInfo[], referenceDeclarations: AstReferences, abiAllocations: Allocations.AbiAllocations): Allocations.EventAllocations {
  let allocations: Allocations.EventAllocations = {};
  for(let {abi, id: contractId} of contracts) {
    let contractKind = referenceDeclarations[contractId].contractKind;
    let contractAllocations = getEventAllocationsForContract(abi, contractId, referenceDeclarations, abiAllocations);
    for(let {selector, topics, allocation} of contractAllocations) {
      if(allocations[topics] === undefined) {
        allocations[topics] = { bySelector: {}, anonymous: { contract: {}, library: {} } };
      }
      if(selector !== undefined) {
        if(allocations[topics].bySelector[selector] === undefined) {
          allocations[topics].bySelector[selector] = { contract: {}, library: {} };
        }
        allocations[topics].bySelector[selector][contractKind][contractId] = allocation;
      }
      else {
        if(allocations[topics].anonymous[contractKind][contractId] === undefined) {
          allocations[topics].anonymous[contractKind][contractId] = [];
        }
        allocations[topics].anonymous[contractKind][contractId].push(allocation);
      }
    }
  }
  return allocations;
}
