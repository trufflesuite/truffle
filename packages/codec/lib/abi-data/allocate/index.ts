import debugModule from "debug";
const debug = debugModule("codec:abi-data:allocate");

export * as Utils from "./utils";

import type * as Abi from "@truffle/abi-utils";

import * as Import from "@truffle/codec/abi-data/import";
import * as AbiDataUtils from "@truffle/codec/abi-data/utils";
import * as Web3Utils from "web3-utils";
import * as Evm from "@truffle/codec/evm";
import * as Common from "@truffle/codec/common";
import type * as Compiler from "@truffle/codec/compiler";
import * as Conversion from "@truffle/codec/conversion";
import * as Ast from "@truffle/codec/ast";
import type * as Contexts from "@truffle/codec/contexts";
import { makeTypeId } from "@truffle/codec/contexts/import";
import type * as Pointer from "@truffle/codec/pointer";
import type {
  AbiAllocation,
  AbiAllocations,
  AbiMemberAllocation,
  AbiSizeInfo,
  CalldataAndReturndataAllocation,
  FunctionCalldataAndReturndataAllocation,
  ConstructorCalldataAndReturndataAllocation,
  CalldataAllocation,
  ReturndataAllocation,
  ReturnValueReturndataAllocation,
  RevertReturndataAllocation,
  ConstructorReturndataAllocation,
  MessageReturndataAllocation,
  BlankReturndataAllocation,
  ReturnImmutableAllocation,
  CalldataAllocations,
  CalldataAllocationTemporary,
  CalldataArgumentAllocation,
  ContractAllocationInfo,
  ContractAndContexts,
  EventAllocation,
  EventAllocations,
  EventAllocationTemporary,
  EventArgumentAllocation,
  ReturndataAllocations
} from "./types";
import type { DecodingMode } from "@truffle/codec/types";
import * as Format from "@truffle/codec/format";
import partition from "lodash/partition";

export {
  AbiAllocations,
  AbiSizeInfo,
  CalldataAllocation,
  ReturndataAllocation,
  ReturnValueReturndataAllocation,
  RevertReturndataAllocation,
  ConstructorReturndataAllocation,
  MessageReturndataAllocation,
  BlankReturndataAllocation,
  CalldataAndReturndataAllocation,
  FunctionCalldataAndReturndataAllocation,
  ContractAllocationInfo,
  ContractAndContexts,
  EventAllocation,
  ReturndataAllocations
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

export const FallbackOutputAllocation: MessageReturndataAllocation = {
  kind: "returnmessage",
  selector: new Uint8Array(), //empty
  allocationMode: "full"
};

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
    ({
      size: length,
      dynamic: dynamicMember,
      allocations
    } = abiSizeAndAllocate(member.type, userDefinedTypes, allocations));

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
    case "userDefinedValueType":
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
          const {
            size: baseSize,
            dynamic,
            allocations
          } = abiSizeAndAllocate(
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
  abiEntry: Abi.FunctionEntry | Abi.ConstructorEntry,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined,
  constructorContext?: Contexts.Context,
  deployedContext?: Contexts.Context
): CalldataAndReturndataAllocation | undefined {
  //first: determine the corresponding function node
  //(simultaneously: determine the offset)
  let node: Ast.AstNode | undefined = undefined;
  let inputParametersFull: Ast.AstNode[];
  let outputParametersFull: Ast.AstNode[];
  let inputParametersAbi: Abi.Parameter[];
  let outputParametersAbi: Abi.Parameter[];
  let offset: number; //refers to INPUT offset; output offset is always 0
  debug("allocating calldata and returndata");
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
        node = findNodeAndContract(
          linearizedBaseContracts,
          referenceDeclarations,
          functionNode =>
            AbiDataUtils.definitionMatchesAbi(
              abiEntry,
              functionNode,
              referenceDeclarations
            ),
          contractNode
        ).node; //may be undefined!  that's OK!
        debug("found node: %o", Boolean(node));
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
        ({ inputs: inputParametersFull, outputs: outputParametersFull } =
          Ast.Utils.getterParameters(node, referenceDeclarations));
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
  let { allocation: abiAllocationInput, mode: inputMode } =
    allocateDataArguments(
      inputParametersFull,
      inputParametersAbi,
      userDefinedTypes,
      abiAllocations,
      compilationId,
      compiler,
      offset
    );
  let { allocation: abiAllocationOutput, mode: outputMode } =
    allocateDataArguments(
      outputParametersFull,
      outputParametersAbi,
      userDefinedTypes,
      abiAllocations,
      compilationId,
      compiler
      //note no offset
    );
  debug("modes: %s in, %s out", inputMode, outputMode);
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
      outputsAllocation = constructorOutputAllocation(
        deployedContext,
        contractNode,
        referenceDeclarations,
        outputMode
      );
      break;
  }
  return <CalldataAndReturndataAllocation>{
    input: inputsAllocation,
    output: outputsAllocation
  }; //TS chokes on this for some reason
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
  abiParameters: Abi.Parameter[],
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
      debug("falling back to ABI due to exception!");
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
  abiEntry: Abi.EventEntry,
  eventNode: Ast.AstNode | undefined,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined
): EventAllocation | undefined {
  let parameterTypes: EventParameterInfo[];
  let nodeId: string;
  let id: string;
  //first: determine the corresponding event node
  //if we're doing inheritance processing, we search through base contracts,
  //from most derived (right) to most base (left)
  //if we're not doing inheritance processing (i.e. if eventNode was passed),
  //we search through *all* contracts, plus the top level!  even though we
  //know the event node already, we still need to know where it's defined
  let node: Ast.AstNode | undefined = undefined;
  let definedInNode: Ast.AstNode | undefined = undefined;
  let definedIn: Format.Types.ContractType | null | undefined = undefined;
  let allocationMode: DecodingMode = "full"; //degrade to abi as needed
  debug("allocating ABI: %O", abiEntry);
  if (contractNode) {
    if (eventNode) {
      node = eventNode; //we already know this one!
      //note: we don't use findNodeAndContract here because it's meant for searching
      //through a list of base contracts, that's not really what's going on here
      //(we don't need all its code here anyway)
      definedInNode = Object.values(referenceDeclarations).find(
        possibleContractNode =>
          possibleContractNode.nodeType === "ContractDefinition" &&
          possibleContractNode.nodes.some(
            (possibleEventNode: Ast.AstNode) => possibleEventNode.id === node.id
          )
      );
      if (
        definedInNode &&
        definedInNode.contractKind === "library" &&
        definedInNode.id !== contractNode.id
      ) {
        //skip library events!  (unless this is the library they're from)
        //those are always considered in-play no matter what,
        //so we don't want to handle them here or we'd end up with them appearing twice
        return undefined;
      }
      //if we failed to find what it's in... presumably it was defined at the file level.
      //leave definedInNode undefined; it'll be handled below.
    } else {
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
      if (node) {
        definedInNode = contractNode;
      } else {
        debug("didn't find node in base contract...");
        //let's search for the node among the base contracts.
        //but if we find it...
        //[note: the following code is overcomplicated; it was used
        //when we were trying to get the actual node, it's overcomplicated
        //now that we're just determining its presence.  oh well]
        let linearizedBaseContractsMinusSelf =
          contractNode.linearizedBaseContracts.slice();
        linearizedBaseContractsMinusSelf.shift(); //remove self
        debug("checking contracts: %o", linearizedBaseContractsMinusSelf);
        node = findNodeAndContract(
          linearizedBaseContractsMinusSelf,
          referenceDeclarations,
          eventNode =>
            AbiDataUtils.definitionMatchesAbi(
              //note this needn't actually be a event node, but then it will return false
              abiEntry,
              eventNode,
              referenceDeclarations
            )
          //don't pass deriveContractNode here, we're not checking the contract itself
        ).node; //may be undefined! that's OK!
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
  }
  //otherwise, leave node undefined
  if (node) {
    debug("found node");
    //if we found the node, let's also turn it into a type
    if (definedInNode) {
      definedIn = <Format.Types.ContractType>(
        Ast.Import.definitionToStoredType(
          definedInNode,
          compilationId,
          compiler
        )
      ); //can skip reference declarations argument here
    } else {
      definedIn = null; //for file-level events, once they exist
    }
    //...and set the ID
    id = makeTypeId(node.id, compilationId);
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
    nodeId = node.id.toString();
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
        nodeId,
        nonIndexed,
        userDefinedTypes,
        abiAllocations
      )[nodeId]; //note the implicit conversion from EventParameterInfo to NameTypePair
    } catch {
      allocationMode = "abi";
    }
  }
  if (allocationMode === "abi") {
    //THIS IS DELIBERATELY NOT AN ELSE
    nodeId = "-1"; //fake irrelevant ID
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
      nodeId,
      nonIndexed,
      userDefinedTypes,
      abiAllocations
    )[nodeId]; //note the implicit conversion from EventParameterInfo to NameTypePair
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
    id,
    arguments: argumentsAllocation,
    allocationMode,
    anonymous: abiEntry.anonymous
  };
}

function allocateError(
  abiEntry: Abi.ErrorEntry,
  errorNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined
): RevertReturndataAllocation {
  //first: if we got passed just a node & no abi entry,
  let id: string | undefined = undefined;
  let definedIn: Format.Types.ContractType | undefined | null = undefined;
  let parametersFull: Ast.AstNode[] | undefined = undefined;
  const parametersAbi: Abi.Parameter[] = abiEntry.inputs;
  if (errorNode) {
    //first, set parametersFull
    parametersFull = errorNode.parameters.parameters;
    //now, set id
    id = makeTypeId(errorNode.id, compilationId);
    //now, set definedIn
    let contractNode: Ast.AstNode | null = null;
    for (const node of Object.values(referenceDeclarations)) {
      if (node.nodeType === "ContractDefinition") {
        if (
          node.nodes.some((subNode: Ast.AstNode) => subNode.id === errorNode.id)
        ) {
          contractNode = node;
          break;
        }
      }
      //if we didn't find it, then contractNode is null
      //(and thus so will be definedIn)
    }
    if (contractNode === null) {
      definedIn = null;
    } else {
      definedIn = <Format.Types.ContractType>(
        Ast.Import.definitionToStoredType(contractNode, compilationId, compiler)
      );
    }
  }
  //otherwise, leave parametersFull, id, and definedIn undefined
  const { allocation: abiAllocation, mode: allocationMode } =
    allocateDataArguments(
      parametersFull,
      parametersAbi,
      userDefinedTypes,
      abiAllocations,
      compilationId,
      compiler,
      Evm.Utils.SELECTOR_SIZE //errors use a 4-byte selector
    );
  //finally: transform the allocation appropriately
  const argumentsAllocation = abiAllocation.members.map(member => ({
    ...member,
    pointer: {
      location: "returndata" as const,
      start: member.pointer.start,
      length: member.pointer.length
    }
  }));
  const selector = Conversion.toBytes(AbiDataUtils.abiSelector(abiEntry));
  return {
    kind: "revert",
    selector,
    abi: abiEntry,
    id,
    definedIn,
    arguments: argumentsAllocation,
    allocationMode
  };
}

function getCalldataAllocationsForContract(
  abi: Abi.Abi,
  contractNode: Ast.AstNode,
  constructorContext: Contexts.Context,
  deployedContext: Contexts.Context,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion
): CalldataAllocationTemporary {
  let allocations: CalldataAllocationTemporary = {
    constructorAllocation: undefined,
    //(if it doesn't then it will remain as default)
    functionAllocations: {}
  };
  if (!abi) {
    //if no ABI, can't do much!
    allocations.constructorAllocation = defaultConstructorAllocation(
      constructorContext,
      contractNode,
      referenceDeclarations,
      deployedContext
    );
    return allocations;
  }
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
        allocations.constructorAllocation = <
          ConstructorCalldataAndReturndataAllocation
        >allocateCalldataAndReturndata(
          abiEntry,
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compilationId,
          compiler,
          constructorContext,
          deployedContext
        );
        debug("constructor alloc: %O", allocations.constructorAllocation);
        break;
      case "function":
        allocations.functionAllocations[AbiDataUtils.abiSelector(abiEntry)] = <
          FunctionCalldataAndReturndataAllocation
        >allocateCalldataAndReturndata(
          abiEntry,
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compilationId,
          compiler,
          constructorContext,
          deployedContext
        );
        break;
      default:
        //skip over fallback, error, and event
        break;
    }
  }
  if (!allocations.constructorAllocation) {
    //set a default constructor allocation if we haven't allocated one yet
    allocations.constructorAllocation = defaultConstructorAllocation(
      constructorContext,
      contractNode,
      referenceDeclarations,
      deployedContext
    );
    debug("default constructor alloc: %O", allocations.constructorAllocation);
  }
  return allocations;
}

function defaultConstructorAllocation(
  constructorContext: Contexts.Context,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  deployedContext?: Contexts.Context
): ConstructorCalldataAndReturndataAllocation | undefined {
  if (!constructorContext) {
    return undefined;
  }
  const rawLength = constructorContext.binary.length;
  const offset = (rawLength - 2) / 2; //number of bytes in 0x-prefixed bytestring
  const input = {
    offset,
    abi: AbiDataUtils.DEFAULT_CONSTRUCTOR_ABI,
    arguments: [] as CalldataArgumentAllocation[],
    allocationMode: "full" as const
  };
  const output = constructorOutputAllocation(
    deployedContext,
    contractNode,
    referenceDeclarations,
    "full"
  ); //assume full, degrade as necessary
  return { input, output };
}

//note: context should be deployed context!
function constructorOutputAllocation(
  context: Contexts.Context | undefined,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  allocationMode: DecodingMode
): ConstructorReturndataAllocation {
  if (!context) {
    //just return a default abi mode result
    return {
      selector: new Uint8Array(), //always empty for constructor output
      allocationMode: "abi",
      kind: "bytecode" as const,
      delegatecallGuard: false
    };
  }
  const { immutableReferences, compilationId, compiler, contractKind, binary } =
    context;
  let immutables: ReturnImmutableAllocation[] | undefined;
  if (allocationMode === "full" && immutableReferences) {
    if (contractNode) {
      debug("allocating immutables");
      immutables = [];
      for (const [id, references] of Object.entries(immutableReferences)) {
        if (references.length === 0) {
          continue; //don't allocate immutables that don't exist
        }
        const astId: number = parseInt(id);
        //get the corresponding variable node; potentially fail
        const { node: definition, contract: definedIn } = findNodeAndContract(
          contractNode.linearizedBaseContracts,
          referenceDeclarations,
          node => node.id === astId,
          contractNode
        );
        if (!definition || definition.nodeType !== "VariableDeclaration") {
          debug("didn't find definition for %d!", astId);
          allocationMode = "abi";
          immutables = undefined;
          break;
        }
        const definedInClass = <Format.Types.ContractType>(
          Ast.Import.definitionToStoredType(definedIn, compilationId, compiler)
        ); //can skip reference declarations argument here
        const dataType = Ast.Import.definitionToType(
          definition,
          compilationId,
          compiler
        );
        immutables.push({
          name: definition.name,
          definedIn: definedInClass,
          type: dataType,
          pointer: {
            location: "returndata" as const,
            start: references[0].start,
            length: references[0].length
          }
        });
      }
    } else if (Object.entries(immutableReferences).length > 0) {
      //if there are immutables, but no contract mode, go to abi mode
      debug("immutables but no node!");
      allocationMode = "abi";
    }
  } else {
    debug("no immutables");
  }
  //now, is there a delegatecall guard?
  let delegatecallGuard: boolean = false;
  if (contractKind === "library") {
    //note: I am relying on this being present!
    //(also this part is a bit HACKy)
    const pushAddressInstruction = (0x5f + Evm.Utils.ADDRESS_SIZE).toString(16); //"73"
    const delegateCallGuardString =
      "0x" + pushAddressInstruction + "..".repeat(Evm.Utils.ADDRESS_SIZE);
    if (binary.startsWith(delegateCallGuardString)) {
      delegatecallGuard = true;
    }
  }
  return {
    selector: new Uint8Array(), //always empty for constructor output
    allocationMode,
    kind: "bytecode" as const,
    immutables,
    delegatecallGuard
  };
}

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
      contract.deployedContext,
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
      //set this up under both constructor *and* deployed! this is to handle
      //constructor returndata decoding
      allocations.constructorAllocations[contract.deployedContext.context] =
        contractAllocations.constructorAllocation;
    }
  }
  return allocations;
}

function getReturndataAllocationsForContract(
  abi: Abi.Abi,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined
): RevertReturndataAllocation[] {
  let useAst = Boolean(contractNode && contractNode.usedErrors);
  if (useAst) {
    const errorNodes = contractNode.usedErrors.map(
      errorNodeId => referenceDeclarations[errorNodeId]
    );
    let abis: Abi.ErrorEntry[];
    try {
      abis = errorNodes.map(
        errorNode =>
          <Abi.ErrorEntry>(
            Ast.Utils.definitionToAbi(errorNode, referenceDeclarations)
          )
      );
    } catch {
      useAst = false;
    }
    if (useAst) {
      //i.e. if the above operation succeeded
      return contractNode.usedErrors
        .map(errorNodeId => referenceDeclarations[errorNodeId])
        .map((errorNode, index) =>
          allocateError(
            abis[index],
            errorNode,
            referenceDeclarations,
            userDefinedTypes,
            abiAllocations,
            compilationId,
            compiler
          )
        );
    }
  }
  if (!useAst && abi) {
    //deliberately *not* an else!
    return abi
      .filter((abiEntry: Abi.Entry) => abiEntry.type === "error")
      .filter(
        (abiEntry: Abi.ErrorEntry) =>
          !AbiDataUtils.abiEntryIsObviouslyIllTyped(abiEntry)
      ) //hack workaround
      .map((abiEntry: Abi.ErrorEntry) =>
        allocateError(
          abiEntry,
          undefined,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compilationId,
          compiler
        )
      );
  }
  //otherwise just return nothing
  return [];
}

export function getReturndataAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: { [compilationId: string]: Ast.AstNodes },
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations
): ReturndataAllocations {
  let allContexts: string[] = []
    .concat(
      ...contracts.map(({ deployedContext, constructorContext }) => [
        deployedContext,
        constructorContext
      ])
    )
    .filter(x => x) //filter out nonexistent contexts
    .map(context => context.context);
  allContexts.push(""); //HACK: add fictional empty-string context to represent no-context
  //holds allocations for a given context
  let selfAllocations: { [contextHash: string]: RevertReturndataAllocation[] } =
    {};
  //holds allocations for *other* contexts
  let additionalAllocations: {
    [contextHash: string]: RevertReturndataAllocation[];
  } = {};
  //now: process the allocations for each contract. we'll add each contract's
  //allocations to *its* entries in allocations, and to every *other* entry
  //in additionalAllocations.
  for (const contract of contracts) {
    const contractAllocations = getReturndataAllocationsForContract(
      contract.abi,
      contract.contractNode,
      referenceDeclarations[contract.compilationId],
      userDefinedTypes,
      abiAllocations,
      contract.compilationId,
      contract.compiler
    );
    const contexts: string[] = [
      //contexts for this contract
      contract.deployedContext,
      contract.constructorContext
    ]
      .filter(x => x) //filter out nonexistent contexts
      .map(context => context.context);
    const otherContexts: string[] = allContexts.filter(
      //contexts for all other contracts
      contextHash => !contexts.includes(contextHash)
    );
    //add them to selfAllocations
    for (const contextHash of contexts) {
      selfAllocations[contextHash] = contractAllocations;
    }
    //add them to additionalAllocations
    for (const contextHash of otherContexts) {
      if (additionalAllocations[contextHash] === undefined) {
        additionalAllocations[contextHash] = [];
      }
      additionalAllocations[contextHash] =
        additionalAllocations[contextHash].concat(contractAllocations);
    }
  }
  let allocations: ReturndataAllocations = Object.assign(
    {},
    ...allContexts.map(contextHash => ({ [contextHash]: {} }))
  );
  //now: perform coalescense!
  for (const contract of contracts) {
    //we're setting up contexts again, sorry >_>
    const contexts: string[] = [
      //contexts for this contract
      contract.deployedContext,
      contract.constructorContext
    ]
      .filter(x => x) //filter out nonexistent contexts
      .map(context => context.context);
    for (const contextHash of contexts) {
      allocations[contextHash] = coalesceReturndataAllocations(
        selfAllocations[contextHash] || [],
        additionalAllocations[contextHash] || []
      );
      debug("allocations: %O", allocations[contextHash]);
    }
  }
  //...also coalesce the fake "" context
  allocations[""] = coalesceReturndataAllocations(
    [],
    additionalAllocations[""] || []
  );
  debug("error allocations: %O", allocations);
  return allocations;
}

function coalesceReturndataAllocations(
  selfAllocations: RevertReturndataAllocation[],
  additionalAllocations: RevertReturndataAllocation[]
): { [selector: string]: RevertReturndataAllocation[] } {
  let bySelector: { [selector: string]: RevertReturndataAllocation[] } = {};
  //start with the additional allocations; we want to process
  //the self allocations last, due to special handling of no-ID allocations there
  for (const allocation of additionalAllocations) {
    const signature = AbiDataUtils.abiSignature(allocation.abi);
    const selector = Web3Utils.soliditySha3({
      type: "string",
      value: signature
    }).slice(0, 2 + 2 * Evm.Utils.SELECTOR_SIZE); //arithmetic to account for hex string
    if (bySelector[selector]) {
      //note: at this point, for any given signature, there should only be a
      //no-ID allocation for that signature if it's the only one
      if (allocation.id !== undefined) {
        //delete anything with that signature but w/o an ID, or with this same ID
        bySelector[selector] = bySelector[selector].filter(
          ({ abi, id }) =>
            !(
              AbiDataUtils.abiSignature(abi) === signature &&
              (id === undefined || id === allocation.id)
            )
        );
        //add this allocation
        bySelector[selector].push(allocation);
      } else if (
        !bySelector[selector].some(
          ({ abi }) => AbiDataUtils.abiSignature(abi) === signature
        )
      ) {
        //only add ID-less ones if there isn't anything of that signature already
        bySelector[selector].push(allocation);
      }
    } else {
      //if there's nothing there thus far, add it
      bySelector[selector] = [allocation];
    }
  }
  //now we're going to perform a modified version of this procedure for the self allocations:
  //1. we're going to add to the front, not the back
  //2. we can add an ID-less one even if there are already ones with IDs there
  //(sorry for the copypaste)
  for (const allocation of selfAllocations) {
    const signature = AbiDataUtils.abiSignature(allocation.abi);
    const selector = Web3Utils.soliditySha3({
      type: "string",
      value: signature
    }).slice(0, 2 + 2 * Evm.Utils.SELECTOR_SIZE); //arithmetic to account for hex string
    if (bySelector[selector]) {
      //delete anything with that signature but w/o an ID, or with this same ID
      //(if this alloc has no ID, this will only delete ID-less ones :) )
      bySelector[selector] = bySelector[selector].filter(
        ({ abi, id }) =>
          !(
            AbiDataUtils.abiSignature(abi) === signature &&
            (id === undefined || id === allocation.id)
          )
      );
      //add this allocation to front, not back!
      bySelector[selector].unshift(allocation);
    } else {
      //if there's nothing there thus far, add it
      bySelector[selector] = [allocation];
    }
  }
  return bySelector;
}

function getEventAllocationsForContract(
  abi: Abi.Abi,
  contractNode: Ast.AstNode | undefined,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  compilationId: string,
  compiler: Compiler.CompilerVersion | undefined
): EventAllocationTemporary[] {
  let useAst = Boolean(contractNode && contractNode.usedEvents);
  if (useAst) {
    const eventNodes = contractNode.usedEvents.map(
      eventNodeId => referenceDeclarations[eventNodeId]
    );
    let abis: Abi.EventEntry[];
    try {
      abis = eventNodes.map(
        eventNode =>
          <Abi.EventEntry>(
            Ast.Utils.definitionToAbi(eventNode, referenceDeclarations)
          )
      );
    } catch {
      useAst = false;
    }
    if (useAst) {
      //i.e. if the above operation succeeded
      return contractNode.usedEvents
        .map(eventNodeId => referenceDeclarations[eventNodeId])
        .map((eventNode, index) => ({
          selector: AbiDataUtils.abiSelector(abis[index]),
          anonymous: abis[index].anonymous,
          topics: AbiDataUtils.topicsCount(abis[index]),
          allocation: allocateEvent(
            abis[index],
            eventNode,
            contractNode,
            referenceDeclarations,
            userDefinedTypes,
            abiAllocations,
            compilationId,
            compiler
          )
        }))
        .filter(
          allocationTemporary => allocationTemporary.allocation !== undefined
        );
      //filter out library events
    }
  }
  if (!useAst && abi) {
    return abi
      .filter((abiEntry: Abi.Entry) => abiEntry.type === "event")
      .filter(
        (abiEntry: Abi.EventEntry) =>
          !AbiDataUtils.abiEntryIsObviouslyIllTyped(abiEntry)
      ) //hack workaround
      .map((abiEntry: Abi.EventEntry) => ({
        selector: AbiDataUtils.abiSelector(abiEntry),
        anonymous: abiEntry.anonymous,
        topics: AbiDataUtils.topicsCount(abiEntry),
        allocation: allocateEvent(
          abiEntry,
          undefined, //we don't know the event node
          contractNode,
          referenceDeclarations,
          userDefinedTypes,
          abiAllocations,
          compilationId,
          compiler
        )
        //note we do *not* filter out undefined allocations; we need these as placeholders
      }));
  }
  //otherwise just return nothing
  return [];
}

//WARNING: this function is full of hacks... sorry
export function getEventAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: { [compilationId: string]: Ast.AstNodes },
  userDefinedTypes: Format.Types.TypesById,
  abiAllocations: AbiAllocations,
  allowConstructorEvents: boolean = false
): EventAllocations {
  //first: do allocations for individual contracts
  let individualAllocations: {
    [contractKey: string]: {
      [selector: string]: {
        context: Contexts.Context;
        contractNode: Ast.AstNode;
        allocationTemporary: EventAllocationTemporary;
        compilationId: string;
      };
    };
  } = {};
  let groupedAllocations: {
    [contractKey: string]: {
      [selector: string]: {
        context: Contexts.Context;
        contractNode: Ast.AstNode;
        allocationsTemporary: EventAllocationTemporary[];
      };
    };
  } = {};
  let contextSwapMap: { [contextHash: string]: string } = {}; //maps deployed to constructor & vice versa
  let allocations: EventAllocations = {};
  for (const {
    abi,
    deployedContext,
    constructorContext,
    contractNode,
    compilationId,
    compiler
  } of contracts) {
    if (!deployedContext && !constructorContext && !contractNode) {
      //we'll need *one* of these at least
      continue;
    }
    const contractAllocations = getEventAllocationsForContract(
      abi,
      contractNode,
      referenceDeclarations[compilationId],
      userDefinedTypes,
      abiAllocations,
      compilationId,
      compiler
    );
    const key = makeContractKey(
      deployedContext || constructorContext,
      contractNode ? contractNode.id : undefined,
      compilationId
    );
    if (individualAllocations[key] === undefined) {
      individualAllocations[key] = {};
    }
    for (const allocationTemporary of contractAllocations) {
      //we'll use selector *even for anonymous* here, because it's just
      //for determining what overrides what at this point
      individualAllocations[key][allocationTemporary.selector] = {
        context: deployedContext || constructorContext, //this is only used for determining contractKind, so we can use either one
        contractNode,
        allocationTemporary,
        compilationId
      };
    }
    //also: set up the swap map
    if (deployedContext && constructorContext) {
      contextSwapMap[deployedContext.context] = constructorContext.context;
      contextSwapMap[constructorContext.context] = deployedContext.context;
    }
  }
  //now: put things together for inheritance
  //note how we always put things in order from most derived to most base
  for (let contextOrId in individualAllocations) {
    groupedAllocations[contextOrId] = {};
    for (let selector in individualAllocations[contextOrId]) {
      let { context, contractNode, allocationTemporary, compilationId } =
        individualAllocations[contextOrId][selector];
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
      //if no contract node, or if we're dealing with a contract node that
      //lists it's used events for us, that's all.  but otherwise...
      if (contractNode && contractNode.usedEvents === undefined) {
        //...we have to do inheritance processing
        debug("contract Id: %d", contractNode.id);
        debug("base contracts: %o", contractNode.linearizedBaseContracts);
        let linearizedBaseContractsMinusSelf =
          contractNode.linearizedBaseContracts.slice();
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
          let baseContext =
            baseContractInfo.deployedContext ||
            baseContractInfo.constructorContext;
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
      let { allocationsTemporary, context } =
        groupedAllocations[contextHash][selector];
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
          //push the allocation (non-anonymous case)
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
          //...and push it in the swapped context too if that exists
          //HACK: don't do this for libraries! library events are already
          //considered always in play, so including them *twice* would cause
          //problems... fortunately library constructors don't emit events!
          if (
            allowConstructorEvents &&
            contextHash in contextSwapMap &&
            contractKind !== "library"
          ) {
            const swappedHash = contextSwapMap[contextHash];
            if (
              allocations[topics].bySelector[selector][contractKind][
                swappedHash
              ] === undefined
            ) {
              allocations[topics].bySelector[selector][contractKind][
                swappedHash
              ] = [];
            }
            allocations[topics].bySelector[selector][contractKind][
              swappedHash
            ].push(allocation);
          }
        } else {
          //push the allocation (anonymous case)
          if (
            allocations[topics].anonymous[contractKind][contextHash] ===
            undefined
          ) {
            allocations[topics].anonymous[contractKind][contextHash] = [];
          }
          allocations[topics].anonymous[contractKind][contextHash].push(
            allocation
          );
          //...and push it in the swapped context too if that exists
          //(and it's not a library, see above)
          if (
            allowConstructorEvents &&
            contextHash in contextSwapMap &&
            contractKind !== "library"
          ) {
            const swappedHash = contextSwapMap[contextHash];
            if (
              allocations[topics].anonymous[contractKind][swappedHash] ===
              undefined
            ) {
              allocations[topics].anonymous[contractKind][swappedHash] = [];
            }
            allocations[topics].anonymous[contractKind][swappedHash].push(
              allocation
            );
          }
        }
      }
    }
  }
  return allocations;
}

interface NodeAndContract {
  node: Ast.AstNode | undefined;
  contract: Ast.AstNode | undefined;
}

//if derivedContractNode is passed, we check that before referenceDeclarations
function findNodeAndContract(
  linearizedBaseContracts: number[],
  referenceDeclarations: Ast.AstNodes,
  condition: (node: Ast.AstNode) => boolean,
  derivedContractNode?: Ast.AstNode
): NodeAndContract {
  const searchResult: NodeAndContract | null | undefined =
    linearizedBaseContracts.reduce(
      (
        foundNodeAndContract: NodeAndContract | undefined | null,
        baseContractId: number
      ) => {
        if (foundNodeAndContract !== undefined) {
          return foundNodeAndContract; //once we've found something, we don't need to keep looking
        }
        debug("searching contract %d", baseContractId);
        let baseContractNode =
          derivedContractNode && baseContractId === derivedContractNode.id
            ? derivedContractNode //skip the lookup if we already have the right node! this is to reduce errors from collision
            : referenceDeclarations[baseContractId];
        if (
          baseContractNode === undefined ||
          baseContractNode.nodeType !== "ContractDefinition"
        ) {
          debug("bad contract node!");
          return null; //return null rather than undefined so that this will propagate through
          //(i.e. by returning null here we give up the search)
          //(we don't want to continue due to possibility of grabbing the wrong override)
        }
        const node = baseContractNode.nodes.find(condition); //may be undefined! that's OK!
        if (node) {
          debug("found node: %o", node);
          return {
            node,
            contract: baseContractNode
          };
        } else {
          return undefined;
        }
      },
      undefined //start with no node found
    );
  return searchResult || { node: undefined, contract: undefined };
}

function makeContractKey(
  context: Contexts.Context | undefined,
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
