import debugModule from "debug";
const debug = debugModule("codec:abi:allocate");

import * as AbiData from "@truffle/codec/abi-data/types";
import * as Import from "@truffle/codec/abi-data/import";
import * as AbiDataUtils from "@truffle/codec/abi-data/utils";
import * as Evm from "@truffle/codec/evm";
import * as Common from "@truffle/codec/common";
import * as Compiler from "@truffle/codec/compiler";
import * as Ast from "@truffle/codec/ast";
import * as Contexts from "@truffle/codec/contexts";
import * as Pointer from "@truffle/codec/pointer";
import {
  AbiAllocation,
  AbiAllocations,
  AbiMemberAllocation,
  AbiSizeInfo,
  CalldataAllocation,
  CalldataAllocations,
  CalldataAllocationTemporary,
  CalldataArgumentAllocation,
  ContractAllocationInfo,
  EventAllocation,
  EventAllocations,
  EventAllocationTemporary,
  EventArgumentAllocation
} from "./types";
import { DecodingMode } from "@truffle/codec/types";
import * as Format from "@truffle/codec/format";
import partition from "lodash.partition";

export {
  AbiAllocations,
  AbiSizeInfo,
  CalldataAllocation,
  ContractAllocationInfo,
  EventAllocation
};

interface AbiAllocationInfo {
  size?: number; //left out for types that don't go in the abi
  dynamic?: boolean; //similarly
  allocations: AbiAllocations;
}

interface EventParameterInfo {
  type: Format.Types.Type;
  name: string;
  indexed: boolean;
}

export function getAbiAllocations(
  userDefinedTypes: Format.Types.TypesById
): AbiAllocations {
  let allocations: AbiAllocations = {};
  for (const dataType of Object.values(userDefinedTypes)) {
    if (dataType.typeClass === "struct") {
      try {
        allocations = allocateStruct(dataType, userDefinedTypes, allocations);
      } catch (_) {
        //if allocation fails... oh well, allocation fails, we do nothing and just move on :P
        //note: a better way of handling this would probably be to *mark* it
        //as failed rather than throwing an exception as that would lead to less
        //recomputation, but this is simpler and I don't think the recomputation
        //should really be a problem
      }
    }
  }
  return allocations;
}

function allocateStruct(
  dataType: Format.Types.StructType,
  userDefinedTypes: Format.Types.TypesById,
  existingAllocations: AbiAllocations
): AbiAllocations {
  debug("allocating struct: %O", dataType);
  //NOTE: dataType here should be a *stored* type!
  //it is up to the caller to take care of this
  return allocateMembers(
    dataType.id,
    dataType.memberTypes,
    userDefinedTypes,
    existingAllocations
  );
}

//note: we will still allocate circular structs, even though they're not allowed in the abi, because it's
//not worth the effort to detect them.  However on mappings or internal functions, we'll vomit (allocate null)
function allocateMembers(
  parentId: string,
  members: Format.Types.NameTypePair[],
  userDefinedTypes: Format.Types.TypesById,
  existingAllocations: AbiAllocations,
  start: number = 0
): AbiAllocations {
  let dynamic: boolean = false;
  //note that we will mutate the start argument also!

  //don't allocate things that have already been allocated
  if (parentId in existingAllocations) {
    return existingAllocations;
  }

  let allocations = { ...existingAllocations }; //otherwise, we'll be adding to this, so we better clone

  let memberAllocations: AbiMemberAllocation[] = [];

  for (const member of members) {
    let length: number;
    let dynamicMember: boolean;
    ({ size: length, dynamic: dynamicMember, allocations } = abiSizeAndAllocate(
      member.type,
      userDefinedTypes,
      allocations
    ));

    //vomit on illegal types in calldata -- note the short-circuit!
    if (length === undefined) {
      allocations[parentId] = null;
      return allocations;
    }

    let pointer: Pointer.AbiPointer = {
      location: "abi",
      start,
      length
    };

    memberAllocations.push({
      name: member.name,
      type: member.type,
      pointer
    });

    start += length;
    dynamic = dynamic || dynamicMember;
  }

  allocations[parentId] = {
    members: memberAllocations,
    length: dynamic ? Evm.Utils.WORD_SIZE : start,
    dynamic
  };

  return allocations;
}

//first return value is the actual size.
//second return value is whether the type is dynamic
//both will be undefined if type is a mapping or internal function
//third return value is resulting allocations, INCLUDING the ones passed in
function abiSizeAndAllocate(
  dataType: Format.Types.Type,
  userDefinedTypes: Format.Types.TypesById,
  existingAllocations?: AbiAllocations
): AbiAllocationInfo {
  switch (dataType.typeClass) {
    case "bool":
    case "address":
    case "contract":
    case "int":
    case "uint":
    case "fixed":
    case "ufixed":
    case "enum":
      return {
        size: Evm.Utils.WORD_SIZE,
        dynamic: false,
        allocations: existingAllocations
      };

    case "string":
      return {
        size: Evm.Utils.WORD_SIZE,
        dynamic: true,
        allocations: existingAllocations
      };

    case "bytes":
      return {
        size: Evm.Utils.WORD_SIZE,
        dynamic: dataType.kind === "dynamic",
        allocations: existingAllocations
      };

    case "mapping":
      return {
        allocations: existingAllocations
      };

    case "function":
      switch (dataType.visibility) {
        case "external":
          return {
            size: Evm.Utils.WORD_SIZE,
            dynamic: false,
            allocations: existingAllocations
          };
        case "internal":
          return {
            allocations: existingAllocations
          };
      }

    case "array": {
      switch (dataType.kind) {
        case "dynamic":
          return {
            size: Evm.Utils.WORD_SIZE,
            dynamic: true,
            allocations: existingAllocations
          };
        case "static":
          if (dataType.length.isZero()) {
            //arrays of length 0 are static regardless of base type
            return {
              size: 0,
              dynamic: false,
              allocations: existingAllocations
            };
          }
          const { size: baseSize, dynamic, allocations } = abiSizeAndAllocate(
            dataType.baseType,
            userDefinedTypes,
            existingAllocations
          );
          return {
            //WARNING!  The use of toNumber() here may throw an exception!
            //I'm judging this OK since if you have arrays that large we have bigger problems :P
            size: dataType.length.toNumber() * baseSize,
            dynamic,
            allocations
          };
      }
    }

    case "struct": {
      let allocations: AbiAllocations = existingAllocations;
      let allocation: AbiAllocation | null | undefined =
        allocations[dataType.id];
      if (allocation === undefined) {
        //if we don't find an allocation, we'll have to do the allocation ourselves
        const storedType = <Format.Types.StructType>(
          userDefinedTypes[dataType.id]
        );
        if (!storedType) {
          throw new Common.UnknownUserDefinedTypeError(
            dataType.id,
            Format.Types.typeString(dataType)
          );
        }
        debug("storedType: %O", storedType);
        allocations = allocateStruct(
          storedType,
          userDefinedTypes,
          existingAllocations
        );
        allocation = allocations[storedType.id];
      }
      //having found our allocation, if it's not null, we can just look up its size and dynamicity
      if (allocation !== null) {
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

    case "tuple": {
      //Warning! Yucky wasteful recomputation here!
      let size = 0;
      let dynamic = false;
      //note that we don't just invoke allocateStruct here!
      //why not? because it has no ID to store the result in!
      //and we can't use a fake like -1 because there might be a recursive call to it,
      //and then the results would overwrite each other
      //I mean, we could do some hashing thing or something, but I think it's easier to just
      //copy the logic in this one case (sorry)
      for (let member of dataType.memberTypes) {
        let { size: memberSize, dynamic: memberDynamic } = abiSizeAndAllocate(
          member.type,
          userDefinedTypes,
          existingAllocations
        );
        size += memberSize;
        dynamic = dynamic || memberDynamic;
      }
      return { size, dynamic, allocations: existingAllocations };
    }
  }
}

//assumes you've already done allocation! don't use if you haven't!
/**
 * @protected
 */
export function abiSizeInfo(
  dataType: Format.Types.Type,
  allocations?: AbiAllocations
): AbiSizeInfo {
  let { size, dynamic } = abiSizeAndAllocate(dataType, null, allocations);
  //the above line should work fine... as long as allocation is already done!
  //the middle argument, userDefinedTypes, is only needed during allocation
  //again, this function is only for use if allocation is done, so it's safe to pass null here
  return { size, dynamic };
}

//allocates an external call
//NOTE: returns just a single allocation; assumes primary allocation is already complete!
//NOTE: returns undefined if attempting to allocate a constructor but we don't have the
//bytecode for the constructor
function allocateCalldata(
  abiEntry: AbiData.FunctionAbiEntry | AbiData.ConstructorAbiEntry,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compiler: Compiler.CompilerVersion | undefined,
  constructorContext?: Contexts.DecoderContext
): CalldataAllocation | undefined {
  //first: determine the corresponding function node
  //(simultaneously: determine the offset)
  let node: Ast.AstNode | undefined = undefined;
  let offset: number;
  let id: string;
  let abiAllocation: AbiAllocation;
  let parameterTypes: Format.Types.NameTypePair[];
  let allocationMode: DecodingMode = "full"; //degrade to ABI if needed
  switch (abiEntry.type) {
    case "constructor":
      if (!constructorContext) {
        return undefined;
      }
      let rawLength = constructorContext.binary.length;
      offset = (rawLength - 2) / 2; //number of bytes in 0x-prefixed bytestring
      //for a constructor, we only want to search the particular contract
      if (contractNode) {
        node = contractNode.nodes.find(functionNode =>
          AbiDataUtils.definitionMatchesAbi(
            //note this needn't actually be a function node, but then it will
            //return false (well, unless it's a getter node!)
            abiEntry,
            functionNode,
            referenceDeclarations
          )
        );
      }
      //if we can't find it, we'll handle this below
      break;
    case "function":
      offset = Evm.Utils.SELECTOR_SIZE;
      //search through base contracts, from most derived (right) to most base (left)
      if (contractNode) {
        const linearizedBaseContracts = contractNode.linearizedBaseContracts;
        node = linearizedBaseContracts.reduceRight(
          (foundNode: Ast.AstNode, baseContractId: number) => {
            if (foundNode !== undefined) {
              return foundNode; //once we've found something, we don't need to keep looking
            }
            let baseContractNode = referenceDeclarations[baseContractId];
            if (baseContractNode === undefined) {
              return null; //return null rather than undefined so that this will propagate through
              //(i.e. by returning null here we give up the search)
              //(we don't want to continue due to possibility of grabbing the wrong override)
            }
            return baseContractNode.nodes.find(
              //may be undefined! that's OK!
              functionNode =>
                AbiDataUtils.definitionMatchesAbi(
                  abiEntry,
                  functionNode,
                  referenceDeclarations
                )
            );
          },
          undefined //start with no node found
        );
      }
      break;
  }
  if (!node) {
    allocationMode = "abi";
  }
  if (allocationMode === "full") {
    //get the parameters; how this works depends on whether we're looking at
    //a normal function or a getter
    let parameters: Ast.AstNode[];
    switch (node.nodeType) {
      case "FunctionDefinition":
        parameters = node.parameters.parameters;
        break;
      case "VariableDeclaration":
        //getter case
        parameters = Ast.Utils.getterInputs(node);
        break;
    }
    id = node.id.toString();
    parameterTypes = parameters.map(parameter => ({
      name: parameter.name,
      type: Ast.Import.definitionToType(parameter, compiler) //if node is defined, compiler had also better be!
    }));
    //now: perform the allocation!
    try {
      abiAllocation = allocateMembers(
        id,
        parameterTypes,
        userDefinedTypes,
        abiAllocations,
        offset
      )[id];
    } catch {
      //if something goes wrong, switch to ABI mdoe
      allocationMode = "abi";
    }
  }
  if (allocationMode === "abi") {
    //THIS IS DELIBERATELY NOT AN ELSE
    //this is the ABI case.  we end up here EITHER
    //if node doesn't exist, OR if something went wrong
    //during allocation
    id = "-1"; //fake irrelevant ID
    parameterTypes = abiEntry.inputs.map(parameter => ({
      name: parameter.name,
      type: Import.abiParameterToType(parameter)
    }));
    abiAllocation = allocateMembers(
      id,
      parameterTypes,
      userDefinedTypes,
      abiAllocations,
      offset
    )[id];
  }
  //finally: transform the allocation appropriately
  let argumentsAllocation = abiAllocation.members.map(member => ({
    ...member,
    pointer: {
      location: "calldata" as const,
      start: member.pointer.start,
      length: member.pointer.length
    }
  }));
  return {
    abi: abiEntry,
    offset,
    arguments: argumentsAllocation,
    allocationMode
  };
}

interface EventParameterInfo {
  name: string;
  type: Format.Types.Type;
  indexed: boolean;
}

//allocates an event
//NOTE: returns just a single allocation; assumes primary allocation is already complete!
function allocateEvent(
  abiEntry: AbiData.EventAbiEntry,
  contractNode: Ast.AstNode | undefined,
  contextHash: string,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compiler: Compiler.CompilerVersion | undefined
): EventAllocation {
  let parameterTypes: EventParameterInfo[];
  let id: string;
  //first: determine the corresponding event node
  //search through base contracts, from most derived (right) to most base (left)
  let node: Ast.AstNode | undefined = undefined;
  let allocationMode: DecodingMode = "full"; //degrade to abi as needed
  if (contractNode) {
    const linearizedBaseContracts = contractNode.linearizedBaseContracts;
    node = linearizedBaseContracts.reduceRight(
      (foundNode: Ast.AstNode, baseContractId: number) => {
        if (foundNode !== undefined) {
          return foundNode; //once we've found something, we don't need to keep looking
        }
        let baseContractNode = referenceDeclarations[baseContractId];
        if (baseContractNode === undefined) {
          return null; //return null rather than undefined so that this will propagate through
          //(i.e. by returning null here we give up the search)
          //(we don't want to continue due to possibility of grabbing the wrong override)
        }
        return baseContractNode.nodes.find(
          //may be undefined! that's OK!
          eventNode =>
            AbiDataUtils.definitionMatchesAbi(
              //note this needn't actually be a event node, but then it will return false
              abiEntry,
              eventNode,
              referenceDeclarations
            )
        );
      },
      undefined //start with no node found
    );
  }
  //otherwise, leave node undefined
  if (!node) {
    allocationMode = "abi";
  }
  //now: construct the list of parameter types, attaching indexedness info
  //and overall position (for later reconstruction)
  let indexed: EventParameterInfo[];
  let nonIndexed: EventParameterInfo[];
  let abiAllocation: AbiAllocation; //the untransformed allocation for the non-indexed parameters
  if (allocationMode === "full") {
    let id = node.id.toString();
    let parameters = node.parameters.parameters;
    parameterTypes = parameters.map(definition => ({
      //note: if node is defined, compiler had better be defined, too!
      type: Ast.Import.definitionToType(definition, compiler),
      name: definition.name,
      indexed: definition.indexed
    }));
    //now: split the list of parameters into indexed and non-indexed
    [indexed, nonIndexed] = partition(
      parameterTypes,
      (parameter: EventParameterInfo) => parameter.indexed
    );
    try {
      //now: perform the allocation for the non-indexed parameters!
      abiAllocation = allocateMembers(
        id,
        nonIndexed,
        userDefinedTypes,
        abiAllocations
      )[id]; //note the implicit conversion from EventParameterInfo to NameTypePair
    } catch {
      allocationMode = "abi";
    }
  }
  if (allocationMode === "abi") {
    //THIS IS DELIBERATELY NOT AN ELSE
    id = "-1"; //fake irrelevant ID
    parameterTypes = abiEntry.inputs.map(abiParameter => ({
      type: Import.abiParameterToType(abiParameter),
      name: abiParameter.name,
      indexed: abiParameter.indexed
    }));
    //now: split the list of parameters into indexed and non-indexed
    [indexed, nonIndexed] = partition(
      parameterTypes,
      (parameter: EventParameterInfo) => parameter.indexed
    );
    //now: perform the allocation for the non-indexed parameters!
    abiAllocation = allocateMembers(
      id,
      nonIndexed,
      userDefinedTypes,
      abiAllocations
    )[id]; //note the implicit conversion from EventParameterInfo to NameTypePair
  }
  //now: transform the result appropriately
  const nonIndexedArgumentsAllocation = abiAllocation.members.map(member => ({
    ...member,
    pointer: {
      location: "eventdata" as const,
      start: member.pointer.start,
      length: member.pointer.length
    }
  }));
  //now: allocate the indexed parameters
  const startingTopic = abiEntry.anonymous ? 0 : 1; //if not anonymous, selector takes up topic 0
  const indexedArgumentsAllocation = indexed.map(
    ({ type, name }, position) => ({
      type,
      name,
      pointer: {
        location: "eventtopic" as const,
        topic: startingTopic + position
      }
    })
  );
  //finally: weave these back together
  let argumentsAllocation: EventArgumentAllocation[] = [];
  for (let parameter of parameterTypes) {
    let arrayToGrabFrom = parameter.indexed
      ? indexedArgumentsAllocation
      : nonIndexedArgumentsAllocation;
    argumentsAllocation.push(arrayToGrabFrom.shift()); //note that push and shift both modify!
  }
  //...and return
  return {
    abi: abiEntry,
    contextHash,
    arguments: argumentsAllocation,
    allocationMode,
    anonymous: abiEntry.anonymous
  };
}

function getCalldataAllocationsForContract(
  abi: AbiData.Abi,
  contractNode: Ast.AstNode,
  constructorContext: Contexts.DecoderContext,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compiler: Compiler.CompilerVersion
): CalldataAllocationTemporary {
  let allocations: CalldataAllocationTemporary = {
    constructorAllocation: defaultConstructorAllocation(constructorContext), //will be overridden if abi has a constructor
    //(if it doesn't then it will remain as default)
    functionAllocations: {}
  };
  for (let abiEntry of abi) {
    switch (abiEntry.type) {
      case "constructor":
        allocations.constructorAllocation = allocateCalldata(
          abiEntry,
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compiler,
          constructorContext
        );
        break;
      case "function":
        allocations.functionAllocations[
          AbiDataUtils.abiSelector(abiEntry)
        ] = allocateCalldata(
          abiEntry,
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compiler,
          constructorContext
        );
        break;
      default:
        //skip over fallback and event
        break;
    }
  }
  return allocations;
}

//note: returns undefined if undefined is passed in
function defaultConstructorAllocation(
  constructorContext: Contexts.DecoderContext
): CalldataAllocation | undefined {
  if (!constructorContext) {
    return undefined;
  }
  let rawLength = constructorContext.binary.length;
  let offset = (rawLength - 2) / 2; //number of bytes in 0x-prefixed bytestring
  return {
    offset,
    abi: AbiDataUtils.DEFAULT_CONSTRUCTOR_ABI,
    arguments: [] as CalldataArgumentAllocation[],
    allocationMode: "full"
  };
}

export function getCalldataAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations
): CalldataAllocations {
  let allocations: CalldataAllocations = {
    constructorAllocations: {},
    functionAllocations: {}
  };
  for (let contract of contracts) {
    const contractAllocations = getCalldataAllocationsForContract(
      contract.abi,
      contract.contractNode,
      contract.constructorContext,
      referenceDeclarations,
      userDefinedTypes,
      abiAllocations,
      contract.compiler
    );
    if (contract.constructorContext) {
      allocations.constructorAllocations[contract.constructorContext.context] =
        contractAllocations.constructorAllocation;
    }
    if (contract.deployedContext) {
      allocations.functionAllocations[contract.deployedContext.context] =
        contractAllocations.functionAllocations;
    }
  }
  return allocations;
}

function getEventAllocationsForContract(
  abi: AbiData.Abi,
  contractNode: Ast.AstNode | undefined,
  contextHash: string,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compiler: Compiler.CompilerVersion | undefined
): EventAllocationTemporary[] {
  return abi
    .filter((abiEntry: AbiData.AbiEntry) => abiEntry.type === "event")
    .map(
      (abiEntry: AbiData.EventAbiEntry) =>
        abiEntry.anonymous
          ? {
              topics: AbiDataUtils.topicsCount(abiEntry),
              allocation: allocateEvent(
                abiEntry,
                contractNode,
                contextHash,
                referenceDeclarations,
                userDefinedTypes,
                abiAllocations,
                compiler
              )
            }
          : {
              selector: AbiDataUtils.abiSelector(abiEntry),
              topics: AbiDataUtils.topicsCount(abiEntry),
              allocation: allocateEvent(
                abiEntry,
                contractNode,
                contextHash,
                referenceDeclarations,
                userDefinedTypes,
                abiAllocations,
                compiler
              )
            }
    );
}

//note: constructor context is ignored by this function; no need to pass it in
export function getEventAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations
): EventAllocations {
  let allocations: EventAllocations = {};
  for (let { abi, deployedContext, contractNode, compiler } of contracts) {
    if (!deployedContext) {
      continue;
    }
    let contractKind = deployedContext.contractKind;
    let contextHash = deployedContext.context;
    let contractAllocations = getEventAllocationsForContract(
      abi,
      contractNode,
      contextHash,
      referenceDeclarations,
      userDefinedTypes,
      abiAllocations,
      compiler
    );
    for (let { selector, topics, allocation } of contractAllocations) {
      if (allocations[topics] === undefined) {
        allocations[topics] = {
          bySelector: {},
          anonymous: { contract: {}, library: {} }
        };
      }
      if (selector !== undefined) {
        if (allocations[topics].bySelector[selector] === undefined) {
          allocations[topics].bySelector[selector] = {
            contract: {},
            library: {}
          };
        }
        allocations[topics].bySelector[selector][contractKind][
          contextHash
        ] = allocation;
      } else {
        if (
          allocations[topics].anonymous[contractKind][contextHash] === undefined
        ) {
          allocations[topics].anonymous[contractKind][contextHash] = [];
        }
        allocations[topics].anonymous[contractKind][contextHash].push(
          allocation
        );
      }
    }
  }
  return allocations;
}
