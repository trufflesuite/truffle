import * as Format from "@truffle/codec/format";
import * as Pointer from "@truffle/codec/pointer";

//memory works the same as abi except we don't bother keeping track of size
//(it's always 1 word) or dynamicity (meaningless in memory)
//Note: for mappings we use a pointer of length 0

//note: these types are a little overcomplicated now
//but whatever, leaving them in

export interface MemoryAllocations {
  [id: string]: MemoryAllocation;
}

export interface MemoryAllocation {
  members: MemoryMemberAllocation[];
}

export interface MemoryMemberAllocation {
  name: string;
  type: Format.Types.Type;
  pointer: Pointer.MemoryPointer;
}
