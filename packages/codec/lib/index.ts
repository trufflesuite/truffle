//So, what shall codec export...?

//First: export the data format
export * from "./format";

//next: export all the utils!
//you can't do "export * as Name" for whatever reason so...
import * as Utils from "./utils";
export { Utils };

//next: export the interface, duh
export * from "./interface";

//now... various low-level stuff we want to export!
//the actual decoding functions
export { decodeVariable, decodeEvent, decodeCalldata } from "./core/decoding";

//the debugger needs to get its allocations, and deal with storage sizes
export { getStorageAllocations, storageSize } from "./allocate/storage";
export { getAbiAllocations } from "./allocate/abi";
export { getMemoryAllocations } from "./allocate/memory";
//and to read the stack
export { readStack } from "./read/stack";

//finally, let's export the low-level encoding functions, because why not, someone
//might want them :P
export { encodeAbi, encodeTupleAbi } from "./encode/abi";
export { encodeMappingKey } from "./encode/key";
//(actually we use at least one of these in tests atm so we'd better export!)

//now: what types should we export? (other than the ones from ./format)
//public-facing types for the interface
export {
  ContractState,
  DecodedVariable,
  DecodedTransaction,
  DecodedLog,
  EventOptions
} from "./types/interface";
export * from "./types/decoding"; //all the decoding result types
export * from "./types/errors"; //the various errors we might throw

//for those who want more low-level stuff...
export { AstDefinition, AstReferences } from "./types/ast";
export { DataPointer } from "./types/pointer";
export { EvmInfo } from "./types/evm";
export {
  StorageAllocations,
  AbiAllocations,
  MemoryAllocations
} from "./types/allocation";
export { StorageLength } from "./types/storage";
//and for those who want *all* the types...
import * as InternalTypes from "./types";
export { InternalTypes }; //warning: not organized!
