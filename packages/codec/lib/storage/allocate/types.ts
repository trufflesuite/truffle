import * as Storage from "@truffle/codec/storage/types";
import * as Ast from "@truffle/codec/ast/types";
import * as Pointer from "@truffle/codec/pointer";
import * as Format from "@truffle/codec/format";

//holds a collection of storage allocations for structs
export interface StorageAllocations {
  [id: string]: StorageAllocation;
}

//an individual storage allocation for (the members of) a struct
export interface StorageAllocation {
  size: Storage.StorageLength;
  members: StorageMemberAllocation[];
}

//an individual storage reference for a member of a struct
export interface StorageMemberAllocation {
  name: string;
  type: Format.Types.Type;
  pointer: Pointer.StoragePointer;
}

//holds a collection of storage allocations for contracts,
//indexed by compilation and then by ID
export interface StateAllocations {
  [compilationId: string]: {
    [id: number]: StateAllocation;
  };
}

//an individual storage allocation for (the state variables of) a contract
//(this type is probably unnecessary now but keeping it for consistency)
export interface StateAllocation {
  members: StateVariableAllocation[];
}

//an individual storage reference for a state variable of a contract
export interface StateVariableAllocation {
  definition: Ast.AstNode;
  definedIn: Ast.AstNode;
  compilationId: string;
  pointer:
    | Pointer.StoragePointer
    | Pointer.ConstantDefinitionPointer
    | Pointer.CodeFormPointer;
}
