import { Allocation } from "@seesemichaelj/truffle-decode-utils";

export type DataPointer = StackPointer | MemoryPointer | StoragePointer | LiteralPointer;

export interface GenericPointer {
  typeClass?: string;
}

export interface StackPointer extends GenericPointer {
  stack: number;
}

export interface MemoryPointer extends GenericPointer {
  memory: {
    start: number;
    length: number;
  }
}

export interface StoragePointer extends GenericPointer {
  storage: Allocation.Range;
}

export interface LiteralPointer extends GenericPointer {
  literal: Uint8Array;
}

export function isStackPointer(pointer: DataPointer): pointer is StackPointer {
  return "stack" in pointer;
}

export function isMemoryPointer(pointer: DataPointer): pointer is MemoryPointer {
  return "memory" in pointer;
}

export function isStoragePointer(pointer: DataPointer): pointer is StoragePointer {
  return "storage" in pointer;
}

export function isLiteralPointer(pointer: DataPointer): pointer is LiteralPointer {
  return "literal" in pointer;
}