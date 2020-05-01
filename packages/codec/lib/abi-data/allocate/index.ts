import debugModule from "debug";
const debug = debugModule("codec:abi-data:allocate");

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
  CalldataAndReturndataAllocation,
  CalldataAllocation,
  ReturndataAllocation,
  CalldataAllocations,
  CalldataAllocationTemporary,
  CalldataArgumentAllocation,
  ReturndataArgumentAllocation,
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
  ReturndataAllocation,
  CalldataAndReturndataAllocation,
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
function allocateCalldataAndReturndata(
  abiEntry: AbiData.FunctionAbiEntry | AbiData.ConstructorAbiEntry,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined,
  constructorContext?: Contexts.DecoderContext
): CalldataAndReturndataAllocation | undefined {
  //first: determine the corresponding function node
  //(simultaneously: determine the offset)
  let node: Ast.AstNode | undefined = undefined;
  let inputParametersFull: Ast.AstNode[];
  let outputParametersFull: Ast.AstNode[];
  let inputParametersAbi: AbiData.AbiParameter[];
  let outputParametersAbi: AbiData.AbiParameter[];
  let offset: number; //refers to INPUT offset; output offset is always 0
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
      //search through base contracts, from most derived (left) to most base (right)
      if (contractNode) {
        const linearizedBaseContracts = contractNode.linearizedBaseContracts;
        debug("linearized: %O", linearizedBaseContracts);
        node = linearizedBaseContracts.reduce(
          (foundNode: Ast.AstNode, baseContractId: number) => {
            if (foundNode !== undefined) {
              return foundNode; //once we've found something, we don't need to keep looking
            }
            let baseContractNode =
              baseContractId === contractNode.id
                ? contractNode //skip the lookup if we already have the right node! this is to reduce errors from collision
                : referenceDeclarations[baseContractId];
            if (
              baseContractNode === undefined ||
              baseContractNode.nodeType !== "ContractDefinition"
            ) {
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
  //now: get the parameters (both full-mode & ABI)
  if (node) {
    switch (node.nodeType) {
      case "FunctionDefinition":
        //normal case
        inputParametersFull = node.parameters.parameters;
        outputParametersFull = node.returnParameters.parameters; //this exists even for constructors!
        break;
      case "VariableDeclaration":
        //getter case
        ({
          inputs: inputParametersFull,
          outputs: outputParametersFull
        } = Ast.Utils.getterParameters(node, referenceDeclarations));
        break;
    }
  } else {
    inputParametersFull = undefined;
    outputParametersFull = undefined;
  }
  inputParametersAbi = abiEntry.inputs;
  switch (abiEntry.type) {
    case "function":
      outputParametersAbi = abiEntry.outputs;
      break;
    case "constructor":
      //we just leave this empty for constructors
      outputParametersAbi = [];
      break;
  }
  //now: do the allocation!
  let {
    allocation: abiAllocationInput,
    mode: inputMode
  } = allocateDataArguments(
    inputParametersFull,
    inputParametersAbi,
    userDefinedTypes,
    abiAllocations,
    compilationId,
    compiler,
    offset
  );
  let {
    allocation: abiAllocationOutput,
    mode: outputMode
  } = allocateDataArguments(
    outputParametersFull,
    outputParametersAbi,
    userDefinedTypes,
    abiAllocations,
    compilationId,
    compiler
    //note no offset
  );
  //finally: transform the allocation appropriately
  let inputArgumentsAllocation = abiAllocationInput.members.map(member => ({
    ...member,
    pointer: {
      location: "calldata" as const,
      start: member.pointer.start,
      length: member.pointer.length
    }
  }));
  let outputArgumentsAllocation = abiAllocationOutput.members.map(member => ({
    ...member,
    pointer: {
      location: "returndata" as const,
      start: member.pointer.start,
      length: member.pointer.length
    }
  }));
  let inputsAllocation: CalldataAllocation = {
    abi: abiEntry,
    offset,
    arguments: inputArgumentsAllocation,
    allocationMode: inputMode
  };
  let outputsAllocation: ReturndataAllocation;
  switch (abiEntry.type) {
    case "function":
      outputsAllocation = {
        selector: new Uint8Array(), //empty by default
        arguments: outputArgumentsAllocation,
        allocationMode: outputMode,
        kind: "return" as const
      };
      break;
    case "constructor":
      outputsAllocation = constructorOutputAllocation;
      break;
  }
  return { input: inputsAllocation, output: outputsAllocation };
}

interface AbiAllocationAndMode {
  allocation: AbiAllocation;
  mode: DecodingMode;
}

//note: allocateEvent doesn't use this because it needs additional
//handling for indexed parameters (maybe these can be unified in
//the future though?)
function allocateDataArguments(
  fullModeParameters: Ast.AstNode[] | undefined,
  abiParameters: AbiData.AbiParameter[],
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined,
  offset: number = 0
): AbiAllocationAndMode {
  let allocationMode: DecodingMode = fullModeParameters ? "full" : "abi"; //can degrade
  let parameterTypes: Format.Types.NameTypePair[];
  let abiAllocation: AbiAllocation;
  if (allocationMode === "full") {
    let id = "-1"; //fake ID that doesn't matter
    parameterTypes = fullModeParameters.map(parameter => ({
      name: parameter.name,
      type: Ast.Import.definitionToType(parameter, compilationId, compiler) //if node is defined, compiler had also better be!
    }));
    debug("parameterTypes: %O", parameterTypes);
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
    let id = "-1"; //fake irrelevant ID
    parameterTypes = abiParameters.map(parameter => ({
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
  return { allocation: abiAllocation, mode: allocationMode };
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
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined
): EventAllocation | undefined {
  let parameterTypes: EventParameterInfo[];
  let id: string;
  //first: determine the corresponding event node
  //search through base contracts, from most derived (right) to most base (left)
  let node: Ast.AstNode | undefined = undefined;
  let definedIn: Format.Types.ContractType | undefined = undefined;
  let allocationMode: DecodingMode = "full"; //degrade to abi as needed
  debug("allocating ABI: %O", abiEntry);
  if (contractNode) {
    //first: check same contract for the event
    node = contractNode.nodes.find(eventNode =>
      AbiDataUtils.definitionMatchesAbi(
        //note this needn't actually be an event node, but then it will
        //return false
        abiEntry,
        eventNode,
        referenceDeclarations
      )
    );
    //if we found the node, great!  If not...
    if (!node) {
      debug("didn't find node in base contract...");
      //let's search for the node among the base contracts.
      //but if we find it...
      //[note: the following code is overcomplicated; it was used
      //when we were trying to get the actual node, it's overcomplicated
      //now that we're just determining its presence.  oh well]
      let linearizedBaseContractsMinusSelf = contractNode.linearizedBaseContracts.slice();
      linearizedBaseContractsMinusSelf.shift(); //remove self
      debug("checking contracts: %o", linearizedBaseContractsMinusSelf);
      node = linearizedBaseContractsMinusSelf.reduce(
        (foundNode: Ast.AstNode, baseContractId: number) => {
          debug("checking contract: %d", baseContractId);
          if (foundNode !== undefined) {
            return foundNode; //once we've found something, we don't need to keep looking
          }
          let baseContractNode = referenceDeclarations[baseContractId];
          if (
            baseContractNode === undefined ||
            baseContractNode.nodeType !== "ContractDefinition"
          ) {
            debug("can't find base node, bailing!");
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
      if (node) {
        //...if we find the node in an ancestor, we
        //deliberately *don't* allocate!  instead such cases
        //will be handled during a later combination step
        debug("bailing out for later handling!");
        debug("ABI: %O", abiEntry);
        return undefined;
      }
    }
  }
  //otherwise, leave node undefined
  if (node) {
    debug("found node");
    //if we found the node, let's also turn it into a type
    definedIn = <Format.Types.ContractType>(
      Ast.Import.definitionToStoredType(contractNode, compilationId, compiler)
    ); //can skip reference declarations argument here
  } else {
    //if no node, have to fall back into ABI mode
    debug("falling back to ABI because no node");
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
      type: Ast.Import.definitionToType(definition, compilationId, compiler),
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
    contextHash: undefined, //leave this for later (HACK)
    definedIn,
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
  compilationId: string,
  compiler: Compiler.CompilerVersion
): CalldataAllocationTemporary {
  let allocations: CalldataAllocationTemporary = {
    constructorAllocation: defaultConstructorAllocation(constructorContext), //will be overridden if abi has a constructor
    //(if it doesn't then it will remain as default)
    functionAllocations: {}
  };
  for (let abiEntry of abi) {
    if (
      AbiDataUtils.abiEntryIsObviouslyIllTyped(abiEntry) ||
      AbiDataUtils.abiEntryHasStorageParameters(abiEntry)
    ) {
      //the first of these conditions is a hack workaround for a Solidity bug.
      //the second of these is because... seriously? we're not handling these
      //(at least not for now!) (these only exist prior to Solidity 0.5.6,
      //thankfully)
      continue;
    }
    switch (abiEntry.type) {
      case "constructor":
        allocations.constructorAllocation = allocateCalldataAndReturndata(
          abiEntry,
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compilationId,
          compiler,
          constructorContext
        );
        break;
      case "function":
        allocations.functionAllocations[
          AbiDataUtils.abiSelector(abiEntry)
        ] = allocateCalldataAndReturndata(
          abiEntry,
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compilationId,
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
//for first argument
function defaultConstructorAllocation(
  constructorContext: Contexts.DecoderContext
): CalldataAndReturndataAllocation | undefined {
  if (!constructorContext) {
    return undefined;
  }
  let rawLength = constructorContext.binary.length;
  let offset = (rawLength - 2) / 2; //number of bytes in 0x-prefixed bytestring
  let input = {
    offset,
    abi: AbiDataUtils.DEFAULT_CONSTRUCTOR_ABI,
    arguments: [] as CalldataArgumentAllocation[],
    allocationMode: "full" as const
  };
  let output = constructorOutputAllocation;
  return { input, output };
}

const constructorOutputAllocation: ReturndataAllocation = {
  selector: new Uint8Array(), //empty by default
  allocationMode: "full" as const,
  kind: "bytecode" as const,
  arguments: [] as ReturndataArgumentAllocation[] //included for type niceness but ignored
};

export function getCalldataAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: { [compilationId: string]: Ast.AstNodes },
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
      referenceDeclarations[contract.compilationId],
      userDefinedTypes,
      abiAllocations,
      contract.compilationId,
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
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined
): EventAllocationTemporary[] {
  return abi
    .filter((abiEntry: AbiData.AbiEntry) => abiEntry.type === "event")
    .filter(
      (abiEntry: AbiData.EventAbiEntry) =>
        !AbiDataUtils.abiEntryIsObviouslyIllTyped(abiEntry)
    ) //hack workaround
    .map((abiEntry: AbiData.EventAbiEntry) => ({
      selector: AbiDataUtils.abiSelector(abiEntry),
      anonymous: abiEntry.anonymous,
      topics: AbiDataUtils.topicsCount(abiEntry),
      allocation: allocateEvent(
        abiEntry,
        contractNode,
        referenceDeclarations,
        userDefinedTypes,
        abiAllocations,
        compilationId,
        compiler
      )
    }));
  //note we do *not* filter out undefined allocations; we need these as placeholders
}

//note: constructor context is ignored by this function; no need to pass it in
//WARNING: this function is full of hacks... sorry
export function getEventAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: { [compilationId: string]: Ast.AstNodes },
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations
): EventAllocations {
  //first: do allocations for individual contracts
  let individualAllocations: {
    [contractKey: string]: {
      [selector: string]: {
        context: Contexts.DecoderContext;
        contractNode: Ast.AstNode;
        allocationTemporary: EventAllocationTemporary;
        compilationId: string;
      };
    };
  } = {};
  let groupedAllocations: {
    [contractKey: string]: {
      [selector: string]: {
        context: Contexts.DecoderContext;
        contractNode: Ast.AstNode;
        allocationsTemporary: EventAllocationTemporary[];
      };
    };
  } = {};
  let allocations: EventAllocations = {};
  for (let {
    abi,
    deployedContext,
    contractNode,
    compilationId,
    compiler
  } of contracts) {
    if (!deployedContext && !contractNode) {
      //we'll need *one* of these two at least
      continue;
    }
    let contractKind = contractNode
      ? contractNode.contractKind
      : deployedContext.contractKind;
    let contractAllocations = getEventAllocationsForContract(
      abi,
      contractNode,
      referenceDeclarations[compilationId],
      userDefinedTypes,
      abiAllocations,
      compilationId,
      compiler
    );
    let key = makeContractKey(
      deployedContext,
      contractNode ? contractNode.id : undefined,
      compilationId
    );
    if (individualAllocations[key] === undefined) {
      individualAllocations[key] = {};
    }
    for (let allocationTemporary of contractAllocations) {
      //we'll use selector *even for anonymous* here, because it's just
      //for determining what overrides what at this point
      individualAllocations[key][allocationTemporary.selector] = {
        context: deployedContext,
        contractNode,
        allocationTemporary,
        compilationId
      };
    }
  }
  //now: put things together for inheritance
  //note how we always put things in order from most derived to most base
  for (let contextOrId in individualAllocations) {
    groupedAllocations[contextOrId] = {};
    for (let selector in individualAllocations[contextOrId]) {
      let {
        context,
        contractNode,
        allocationTemporary,
        compilationId
      } = individualAllocations[contextOrId][selector];
      debug("allocationTemporary: %O", allocationTemporary);
      let allocationsTemporary = allocationTemporary.allocation
        ? [allocationTemporary]
        : []; //filter out undefined allocations
      //first, copy from individual allocations
      groupedAllocations[contextOrId][selector] = {
        context,
        contractNode,
        allocationsTemporary
      };
      //if no contract node, that's all.  if there is...
      if (contractNode) {
        //...we have to do inheritance processing
        debug("contract Id: %d", contractNode.id);
        debug("base contracts: %o", contractNode.linearizedBaseContracts);
        let linearizedBaseContractsMinusSelf = contractNode.linearizedBaseContracts.slice();
        linearizedBaseContractsMinusSelf.shift(); //remove contract itself; only want ancestors
        for (let baseId of linearizedBaseContractsMinusSelf) {
          debug("checking baseId: %d", baseId);
          let baseNode = referenceDeclarations[compilationId][baseId];
          if (!baseNode || baseNode.nodeType !== "ContractDefinition") {
            debug("failed to find node for baseId: %d", baseId);
            break; //not a continue!
            //if we can't find the base node, it's better to stop the loop,
            //rather than continue to potentially erroneous things
          }
          //note: we're not actually going to *use* the baseNode here.
          //we're just checking for whether we can *find* it
          //why? because if we couldn't find it, that means that events defined in
          //base contracts *weren't* skipped earlier, and so we shouldn't now add them in
          let baseContractInfo = contracts.find(
            contractAllocationInfo =>
              contractAllocationInfo.compilationId === compilationId &&
              contractAllocationInfo.contractNode &&
              contractAllocationInfo.contractNode.id === baseId
          );
          if (!baseContractInfo) {
            //similar to above... this failure case can happen when there are
            //two contracts with the same name and you attempt to use the
            //artifacts; say you have contracts A, B, and B', where A inherits
            //from B, and B and B' have the same name, and B' is the one that
            //gets the artifact; B will end up in reference declarations and so
            //get found above, but it won't appear in contracts, causing the
            //problem here.  Unfortunately I don't know any great way to handle this,
            //so, uh, we treat it as a failure same as above.
            debug("failed to find contract info for baseId: %d", baseId);
            break;
          }
          let baseContext = baseContractInfo.deployedContext;
          let baseKey = makeContractKey(baseContext, baseId, compilationId);
          if (individualAllocations[baseKey][selector] !== undefined) {
            let baseAllocation =
              individualAllocations[baseKey][selector].allocationTemporary;
            debug("(probably) pushing inherited alloc from baseId: %d", baseId);
            if (baseAllocation.allocation) {
              //don't push undefined!
              groupedAllocations[contextOrId][
                selector
              ].allocationsTemporary.push(baseAllocation);
            }
          }
        }
      }
    }
  }
  //finally: transform into final form & return,
  //filtering out things w/o a context
  for (let contractKey in groupedAllocations) {
    if (!hasContext(contractKey)) {
      continue;
      //(this filters out ones that had no context and therefore were
      //given by ID; we needed these at the previous stage but from
      //here on they're irrelevant)
    }
    let contextHash = contextHashForKey(contractKey);
    for (let selector in groupedAllocations[contextHash]) {
      let { allocationsTemporary, context } = groupedAllocations[contextHash][
        selector
      ];
      for (let { anonymous, topics, allocation } of allocationsTemporary) {
        let contractKind = context.contractKind; //HACK: this is the wrong context, but libraries can't inherit, so it's OK
        if (contractKind !== "library") {
          contractKind = "contract"; //round off interfaces to being contracts for our purposes :P
        }
        allocation = {
          ...allocation,
          contextHash
        }; //the allocation's context hash at this point depends on where it was defined, but
        //that's not what we want going in the final allocation table!
        if (allocations[topics] === undefined) {
          allocations[topics] = {
            bySelector: {},
            anonymous: { contract: {}, library: {} }
          };
        }
        if (!anonymous) {
          if (allocations[topics].bySelector[selector] === undefined) {
            allocations[topics].bySelector[selector] = {
              contract: {},
              library: {}
            };
          }
          if (
            allocations[topics].bySelector[selector][contractKind][
              contextHash
            ] === undefined
          ) {
            allocations[topics].bySelector[selector][contractKind][
              contextHash
            ] = [];
          }
          allocations[topics].bySelector[selector][contractKind][
            contextHash
          ].push(allocation);
        } else {
          if (
            allocations[topics].anonymous[contractKind][contextHash] ===
            undefined
          ) {
            allocations[topics].anonymous[contractKind][contextHash] = [];
          }
          allocations[topics].anonymous[contractKind][contextHash].push(
            allocation
          );
        }
      }
    }
  }
  return allocations;
}

function makeContractKey(
  context: Contexts.DecoderContext | undefined,
  id: number,
  compilationId: string
): string {
  return context ? context.context : id + ":" + compilationId; //HACK!
}

function hasContext(key: string): boolean {
  return key.startsWith("0x"); //HACK!
}

function contextHashForKey(key: string): string {
  return hasContext(key)
    ? key //HACK!
    : undefined;
}
