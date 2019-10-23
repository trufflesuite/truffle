/**
 * Usage:
 *
 * ```
 * import { ... } from "@truffle/codec";
 * ```
 *
 * @module @truffle/codec
 */ /** */

require("source-map-support/register");

//So, what shall codec export...?

//First: export the data format
import * as Format from "@truffle/codec/format";
export { Format };

//next: export all the utils!
//you can't do "export * as Name" for whatever reason so...
import * as Utils from "./utils";
export { Utils };

//now... various low-level stuff we want to export!
//the actual decoding functions and related errors
export { decodeVariable, decodeEvent, decodeCalldata } from "./core/decoding";
export { DecodingError, StopDecodingError } from "./decode/errors";

//and to read the stack
export { readStack } from "./read/stack";

//finally, let's export the low-level encoding functions, because why not, someone
//might want them :P
export { encodeAbi, encodeTupleAbi } from "./encode/abi";
export { encodeMappingKey } from "./encode/key";
//(actually we use at least one of these in tests atm so we'd better export!)

//now: what types should we export? (other than the ones from ./format)
//public-facing types for the interface
export * from "./types";
export * from "./common";

//for those who want more low-level stuff...
import * as Abi from "./abi";
export { Abi };

import * as Ast from "./ast";
export { Ast };

import * as Compiler from "./compiler";
export { Compiler };

import * as Contexts from "./contexts";
export { Contexts };

import * as Pointer from "./pointer";
export { Pointer };

import * as Evm from "./evm";
export { Evm };

import * as Storage from "./storage";
export { Storage };
