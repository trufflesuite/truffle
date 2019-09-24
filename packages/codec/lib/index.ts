//So, what shall codec export...?

//First: Export all the types! (Maybe we should be more selective here? oh well)
export * from "./types";
export { Types, Values, Errors } from "./format";
//next: export all the utils!
//you can't do "export * as Name" for whatever reason so...
import * as Utils from "./utils";
export { Utils } ;
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
