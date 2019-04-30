import { AstDefinition } from "truffle-decode-utils";
import { Range } from "./storage";

export type DataPointer = StackPointer | MemoryPointer | StoragePointer
  | CalldataPointer | StackLiteralPointer | ConstantDefinitionPointer
  | SpecialPointer;

export interface GenericPointer {
  typeClass?: string;
}

export interface StackPointer extends GenericPointer {
  stack: {
    from: number;
    to: number;
  }
}

export interface MemoryPointer extends GenericPointer {
  memory: {
    start: number;
    length: number;
  }
}

export interface CalldataPointer extends GenericPointer {
  calldata: {
    start: number;
    length: number;
  }
}

export interface StoragePointer extends GenericPointer {
  storage: Range;
}

export interface StackLiteralPointer extends GenericPointer {
  literal: Uint8Array;
}

export interface ConstantDefinitionPointer extends GenericPointer {
  definition: AstDefinition;
}

export interface SpecialPointer extends GenericPointer {
  special: string; //sorry
}

export function isStackPointer(pointer: DataPointer): pointer is StackPointer {
  return typeof pointer !== "undefined" && "stack" in pointer;
}

export function isMemoryPointer(pointer: DataPointer): pointer is MemoryPointer {
  return typeof pointer !== "undefined" && "memory" in pointer;
}

export function isCalldataPointer(pointer: DataPointer): pointer is CalldataPointer {
  return typeof pointer !== "undefined" && "calldata" in pointer;
}

export function isStoragePointer(pointer: DataPointer): pointer is StoragePointer {
  return typeof pointer !== "undefined" && "storage" in pointer;
}

export function isStackLiteralPointer(pointer: DataPointer): pointer is StackLiteralPointer {
  return typeof pointer !== "undefined" && "literal" in pointer;
}

export function isConstantDefinitionPointer(pointer: DataPointer): pointer is ConstantDefinitionPointer {
  return typeof pointer !== "undefined" && "definition" in pointer;
}

export function isSpecialPointer(pointer: DataPointer): pointer is SpecialPointer {
  return typeof pointer !== "undefined" && "special" in pointer;
}
