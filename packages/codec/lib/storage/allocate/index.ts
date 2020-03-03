import debugModule from "debug";
const debug = debugModule("codec:storage:allocate");

import { DecodingError } from "@truffle/codec/errors";
import * as Compiler from "@truffle/codec/compiler";
import * as Common from "@truffle/codec/common";
import * as Storage from "@truffle/codec/storage/types";
import * as Utils from "@truffle/codec/storage/utils";
import * as Ast from "@truffle/codec/ast";
import {
  StorageAllocation,
  StorageAllocations,
  StorageMemberAllocation,
  StateAllocation,
  StateAllocations,
  StateVariableAllocation
} from "./types";
import { ContractAllocationInfo } from "@truffle/codec/abi-data/allocate";
import * as Evm from "@truffle/codec/evm";
import * as Format from "@truffle/codec/format";
import BN from "bn.js";
import partition from "lodash.partition";

export {
  StorageAllocation,
  StorageAllocations,
  StorageMemberAllocation,
  StateAllocation,
  StateAllocations,
  StateVariableAllocation
};

export class UnknownBaseContractIdError extends Error {
  public derivedId: number;
  public derivedName: string;
  public derivedKind: string;
  public baseId: number;
  constructor(
    derivedId: number,
    derivedName: string,
    derivedKind: string,
    baseId: number
  ) {
    const message = `Cannot locate base contract ID ${baseId} of ${derivedKind} ${derivedName} (ID ${derivedId})`;
    super(message);
    this.name = "UnknownBaseContractIdError";
    this.derivedId = derivedId;
    this.derivedName = derivedName;
    this.derivedKind = derivedKind;
    this.baseId = baseId;
  }
}

interface StorageAllocationInfo {
  size: Storage.StorageLength;
  allocations: StorageAllocations;
}

interface DefinitionPair {
  definition: Ast.AstNode;
  definedIn?: Ast.AstNode;
}

//contracts contains only the contracts to be allocated; any base classes not
//being allocated should just be in referenceDeclarations
export function getStorageAllocations(
  userDefinedTypes: Format.Types.TypesById
): StorageAllocations {
  let allocations: StorageAllocations = {};
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

/**
 * This function gets allocations for the state variables of the contracts;
 * this is distinct from getStorageAllocations, which gets allocations for
 * storage structs.
 *
 * While mostly state variables are kept in storage, constant ones are not.
 * And immutable ones, once those are introduced, will be kept in code!
 * (But those don't exist yet so this function doesn't handle them yet.)
 */
export function getStateAllocations(
  contracts: ContractAllocationInfo[],
  referenceDeclarations: { [compilationId: string]: Ast.AstNodes },
  userDefinedTypes: Format.Types.TypesById,
  storageAllocations: StorageAllocations,
  existingAllocations: StateAllocations = {}
): StateAllocations {
  let allocations = existingAllocations;
  for (const contractInfo of contracts) {
    let { contractNode: contract, compiler, compilationId } = contractInfo;
    try {
      allocations = allocateContractState(
        contract,
        compilationId,
        compiler,
        referenceDeclarations[compilationId],
        userDefinedTypes,
        storageAllocations,
        allocations
      );
    } catch (_) {
      //we're just going to allow failure here and catch the problem elsewhere
    }
  }
  return allocations;
}

function allocateStruct(
  dataType: Format.Types.StructType,
  userDefinedTypes: Format.Types.TypesById,
  existingAllocations: StorageAllocations
): StorageAllocations {
  //NOTE: dataType here should be a *stored* type!
  //it is up to the caller to take care of this
  return allocateMembers(
    dataType.id,
    dataType.memberTypes,
    userDefinedTypes,
    existingAllocations
  );
}

function allocateMembers(
  parentId: string,
  members: Format.Types.NameTypePair[],
  userDefinedTypes: Format.Types.TypesById,
  existingAllocations: StorageAllocations
): StorageAllocations {
  let offset: number = 0; //will convert to BN when placing in slot
  let index: number = Evm.Utils.WORD_SIZE - 1;

  //don't allocate things that have already been allocated
  if (parentId in existingAllocations) {
    return existingAllocations;
  }

  let allocations = { ...existingAllocations }; //otherwise, we'll be adding to this, so we better clone

  //otherwise, we need to allocate
  let memberAllocations: StorageMemberAllocation[] = [];

  for (const member of members) {
    let size: Storage.StorageLength;
    ({ size, allocations } = storageSizeAndAllocate(
      member.type,
      userDefinedTypes,
      allocations
    ));

    //if it's sized in words (and we're not at the start of slot) we need to start on a new slot
    //if it's sized in bytes but there's not enough room, we also need a new slot
    if (
      Utils.isWordsLength(size)
        ? index < Evm.Utils.WORD_SIZE - 1
        : size.bytes > index + 1
    ) {
      index = Evm.Utils.WORD_SIZE - 1;
      offset += 1;
    }
    //otherwise, we remain in place

    let range: Storage.Range;

    if (Utils.isWordsLength(size)) {
      //words case
      range = {
        from: {
          slot: {
            offset: new BN(offset) //start at the current slot...
          },
          index: 0 //...at the beginning of the word.
        },
        to: {
          slot: {
            offset: new BN(offset + size.words - 1) //end at the current slot plus # of words minus 1...
          },
          index: Evm.Utils.WORD_SIZE - 1 //...at the end of the word.
        }
      };
    } else {
      //bytes case
      range = {
        from: {
          slot: {
            offset: new BN(offset) //start at the current slot...
          },
          index: index - (size.bytes - 1) //...early enough to fit what's being allocated.
        },
        to: {
          slot: {
            offset: new BN(offset) //end at the current slot...
          },
          index: index //...at the current position.
        }
      };
    }
    memberAllocations.push({
      name: member.name,
      type: member.type,
      pointer: {
        location: "storage",
        range
      }
    });
    //finally, adjust the current position.
    //if it was sized in words, move down that many slots and reset position w/in slot
    if (Utils.isWordsLength(size)) {
      offset += size.words;
      index = Evm.Utils.WORD_SIZE - 1;
    }
    //if it was sized in bytes, move down an appropriate number of bytes.
    else {
      index -= size.bytes;
      //but if this puts us into the next word, move to the next word.
      if (index < 0) {
        index = Evm.Utils.WORD_SIZE - 1;
        offset += 1;
      }
    }
  }

  //finally, let's determine the overall siz; we're dealing with a struct, so
  //the size is measured in words
  //it's one plus the last word used, i.e. one plus the current word... unless the
  //current word remains entirely unused, then it's just the current word
  //SPECIAL CASE: if *nothing* has been used, allocate a single word (that's how
  //empty structs behave in versions where they're legal)
  let totalSize: Storage.StorageLength;
  if (index === Evm.Utils.WORD_SIZE - 1 && offset !== 0) {
    totalSize = { words: offset };
  } else {
    totalSize = { words: offset + 1 };
  }

  //having made our allocation, let's add it to allocations!
  allocations[parentId] = {
    members: memberAllocations,
    size: totalSize
  };

  //...and we're done!
  return allocations;
}

function getStateVariables(contractNode: Ast.AstNode): Ast.AstNode[] {
  // process for state variables
  return contractNode.nodes.filter(
    (node: Ast.AstNode) =>
      node.nodeType === "VariableDeclaration" && node.stateVariable
  );
}

function allocateContractState(
  contract: Ast.AstNode,
  compilationId: string,
  compiler: Compiler.CompilerVersion,
  referenceDeclarations: Ast.AstNodes,
  userDefinedTypes: Format.Types.TypesById,
  storageAllocations: StorageAllocations,
  existingAllocations: StateAllocations = {}
): StateAllocations {
  //we're going to do a 2-deep clone here
  let allocations: StateAllocations = Object.assign(
    {},
    ...Object.entries(existingAllocations).map(
      ([compilationId, compilationAllocations]) => ({
        [compilationId]: { ...compilationAllocations }
      })
    )
  );

  //base contracts are listed from most derived to most base, so we
  //have to reverse before processing, but reverse() is in place, so we
  //clone with slice first
  let linearizedBaseContractsFromBase: number[] = contract.linearizedBaseContracts
    .slice()
    .reverse();

  //first, let's get all the variables under consideration
  let variables = [].concat(
    ...linearizedBaseContractsFromBase.map((id: number) => {
      let baseNode = referenceDeclarations[id];
      if (baseNode === undefined) {
        throw new UnknownBaseContractIdError(
          contract.id,
          contract.name,
          contract.contractKind,
          id
        );
      }
      return getStateVariables(baseNode).map(definition => ({
        definition,
        definedIn: baseNode
      }));
    })
  );

  //now: we split the variables into storage variables and constants.
  let [constantVariables, storageVariables] = partition(
    variables,
    variable => variable.definition.constant
  );

  //transform storage variables into data types
  let storageVariableTypes = storageVariables.map(variable => ({
    name: variable.definition.name,
    type: Ast.Import.definitionToType(
      variable.definition,
      compilationId,
      compiler
    )
  }));

  //let's allocate the storage variables using a fictitious ID
  const id = "-1";
  let storageVariableStorageAllocations = allocateMembers(
    id,
    storageVariableTypes,
    userDefinedTypes,
    storageAllocations
  )[id];

  //transform to new format
  let storageVariableAllocations = storageVariables.map(
    ({ definition, definedIn }, index) => ({
      definition,
      definedIn,
      compilationId,
      pointer: storageVariableStorageAllocations.members[index].pointer
    })
  );

  //let's also create allocations for the constants
  let constantVariableAllocations = constantVariables.map(
    ({ definition, definedIn }) => ({
      definition,
      definedIn,
      compilationId,
      pointer: {
        location: "definition" as const,
        definition: definition.value
      }
    })
  );

  //now, reweave the two together
  let contractAllocation: StateVariableAllocation[] = [];
  for (let variable of variables) {
    let arrayToGrabFrom = variable.definition.constant
      ? constantVariableAllocations
      : storageVariableAllocations;
    contractAllocation.push(arrayToGrabFrom.shift()); //note that push and shift both modify!
  }

  //finally, set things and return
  if (!allocations[compilationId]) {
    allocations[compilationId] = {};
  }
  allocations[compilationId][contract.id] = {
    members: contractAllocation
  };

  return allocations;
}

//NOTE: This wrapper function is for use in decoding ONLY, after allocation is done.
//The allocator should (and does) instead use a direct call to storageSizeAndAllocate,
//not to the wrapper, because it may need the allocations returned.
export function storageSize(
  dataType: Format.Types.Type,
  userDefinedTypes?: Format.Types.TypesById,
  allocations?: StorageAllocations
): Storage.StorageLength {
  return storageSizeAndAllocate(dataType, userDefinedTypes, allocations).size;
}

function storageSizeAndAllocate(
  dataType: Format.Types.Type,
  userDefinedTypes?: Format.Types.TypesById,
  existingAllocations?: StorageAllocations
): StorageAllocationInfo {
  switch (dataType.typeClass) {
    case "bool":
      return {
        size: { bytes: 1 },
        allocations: existingAllocations
      };

    case "address":
    case "contract":
      return {
        size: { bytes: Evm.Utils.ADDRESS_SIZE },
        allocations: existingAllocations
      };

    case "int":
    case "uint":
    case "fixed":
    case "ufixed":
      return {
        size: { bytes: dataType.bits / 8 },
        allocations: existingAllocations
      };

    case "enum": {
      const storedType = <Format.Types.EnumType>userDefinedTypes[dataType.id];
      if (!storedType.options) {
        throw new Common.UnknownUserDefinedTypeError(
          dataType.id,
          Format.Types.typeString(dataType)
        );
      }
      const numValues = storedType.options.length;
      return {
        size: { bytes: Math.ceil(Math.log2(numValues) / 8) },
        allocations: existingAllocations
      };
    }

    case "bytes": {
      switch (dataType.kind) {
        case "static":
          return {
            size: { bytes: dataType.length },
            allocations: existingAllocations
          };
        case "dynamic":
          return {
            size: { words: 1 },
            allocations: existingAllocations
          };
      }
    }

    case "string":
    case "mapping":
      return {
        size: { words: 1 },
        allocations: existingAllocations
      };

    case "function": {
      //this case is also really two different cases
      switch (dataType.visibility) {
        case "internal":
          return {
            size: { bytes: Evm.Utils.PC_SIZE * 2 },
            allocations: existingAllocations
          };
        case "external":
          return {
            size: { bytes: Evm.Utils.ADDRESS_SIZE + Evm.Utils.SELECTOR_SIZE },
            allocations: existingAllocations
          };
      }
    }

    case "array": {
      switch (dataType.kind) {
        case "dynamic":
          return {
            size: { words: 1 },
            allocations: existingAllocations
          };
        case "static":
          //static array case
          const length = dataType.length.toNumber(); //warning! but if it's too big we have a problem
          if (length === 0) {
            //in versions of Solidity where it's legal, arrays of length 0 still take up 1 word
            return {
              size: { words: 1 },
              allocations: existingAllocations
            };
          }
          let { size: baseSize, allocations } = storageSizeAndAllocate(
            dataType.baseType,
            userDefinedTypes,
            existingAllocations
          );
          if (!Utils.isWordsLength(baseSize)) {
            //bytes case
            const perWord = Math.floor(Evm.Utils.WORD_SIZE / baseSize.bytes);
            debug("length %o", length);
            const numWords = Math.ceil(length / perWord);
            return {
              size: { words: numWords },
              allocations
            };
          } else {
            //words case
            return {
              size: { words: baseSize.words * length },
              allocations
            };
          }
      }
    }

    case "struct": {
      let allocations: StorageAllocations = existingAllocations;
      let allocation: StorageAllocation | undefined = allocations[dataType.id]; //may be undefined!
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
        allocation = allocations[dataType.id];
      }
      //having found our allocation, we can just look up its size
      return {
        size: allocation.size,
        allocations
      };
    }
  }
}
