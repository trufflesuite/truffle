/**
 * # Truffle Codec
 *
 * This module provides low-level decoding and encoding functionality for
 * Solidity and the Solidity ABI.  Many parts of this module are intended
 * primarily for internal use by Truffle and so remain largely undocumented,
 * but some of its types are also output by @truffle/decoder, which provides
 * a higher-level interface to much of this module's functionality.
 *
 * ## If you're here from Truffle Decoder or Truffle Encoder
 *
 * If you're coming here from [[@truffle/decoder]] or [[@truffle/encoder]],
 * you probably just want to know about the parts that are relevant to you.
 * These are:
 *
 * * The "data" category (specifically [[Format]])
 * * The "output" and "enumerations" categories ([[CalldataDecoding]], [[LogDecoding]], et al., see below)
 * * The "errors" category (specifically [[UnknownUserDefinedTypeError]])
 *
 * Note that the data category is largely scarce in
 * documentation, although that's because it's largely self-explanatory.
 *
 * If you're not just here from Truffle Decoder or Encoder, but are actually
 * interested in the lower-level workings, read on.
 *
 * ## How this module differs from Truffle Decoder and Encoder
 *
 * Unlike Truffle Decoder and Encoder, this library makes no network connections
 * and avoids dependencies that do.  Instead, its decoding functionality
 * is generator-based; calling one of the decoding functions returns a
 * generator.  This generator's `next()` function may return a finished
 * result, or it may return a request for more information.  It is up to
 * the caller to fulfill these requests -- say, by making a network
 * connection of its own.  This is how @truffle/decoder and @truffle/encoder
 * work; @truffle/codec makes requests, while Decoder and Encoder fulfill them by
 * looking up the necessary information on the blockchain.
 *
 * This library also provides additional functionality beyond what's used by
 * Truffle Decoder and Encoder.  In particular, this library also exists to
 * support Truffle Debugger, and so it provides decoding functionality not just
 * for transactions, logs, and state variables, but also for Solidity variables
 * during transaction execution, including circularity detection for memroy
 * structures.  It includes functionality for decoding Solidity's internal
 * function pointers, which the debugger uses, but which Truffle Decoder
 * currently does not (although this is planned for the future).
 *
 * There is also functionality for decoding return values and revert messages
 * that goes beyond what's currently available in @truffle/decoder; this may get
 * a better interface in the future.
 *
 * ## How to use
 *
 * You should probably use [[@truffle/decoder]] or [[@truffle/encoder]]
 * instead, if your use case doesn't preclude it.  This module has little
 * documentation, where it has any at all, and it's likely that parts of its
 * interface may change (particularly regarding allocation).  That said, if you
 * truly need the functionality here, Truffle Decoder and Truffle Encoder can
 * perhaps serve as something of a reference implementation (and perhaps
 * Truffle Debugger as well, though that code is much harder to read or copy).
 *
 * @module @truffle/codec
 * @packageDocumentation
 */

//So, what shall codec export...?

//First: export the data format
import * as Format from "@truffle/codec/format";
export { Format };

//now... various low-level stuff we want to export!
//the actual decoding functions and related errors
export {
  decodeVariable,
  decodeEvent,
  decodeCalldata,
  decodeReturndata,
  decodeRevert
} from "./core";
export {
  DecodingError,
  StopDecodingError,
  NoProjectInfoError
} from "./errors";

//now: what types should we export? (other than the ones from ./format)
//public-facing types for the interface
export type {
  DecodingMode,
  CalldataDecoding,
  LogDecoding,
  ReturndataDecoding,
  FunctionDecoding,
  ConstructorDecoding,
  MessageDecoding,
  UnknownCallDecoding,
  UnknownCreationDecoding,
  EventDecoding,
  AnonymousDecoding,
  ReturnDecoding,
  RawReturnDecoding,
  BytecodeDecoding,
  UnknownBytecodeDecoding,
  SelfDestructDecoding,
  RevertMessageDecoding,
  EmptyFailureDecoding,
  AbiArgument,
  StateVariable,
  DecoderRequest,
  StorageRequest,
  CodeRequest,
  LogOptions,
  ExtrasAllowed,
  WrapRequest,
  IntegerWrapRequest,
  DecimalWrapRequest,
  AddressWrapRequest,
  WrapResponse,
  IntegerWrapResponse,
  DecimalWrapResponse,
  AddressWrapResponse
} from "./types";
export * from "./common";

export {
  abifyCalldataDecoding,
  abifyLogDecoding,
  abifyReturndataDecoding
} from "./abify";

// data locations - common
import * as Basic from "./basic";
import * as Bytes from "./bytes";
export { Basic, Bytes };

// data locations - abi
import * as AbiData from "./abi-data";
import * as Topic from "./topic";
export { AbiData, Topic };

// data locations - solidity
import * as MappingKey from "./mapping-key";
import * as Memory from "./memory";
import * as Special from "./special";
import * as Stack from "./stack";
import * as Storage from "./storage";
import * as AstConstant from "./ast-constant";

export {
  MappingKey,
  Memory,
  Special,
  Stack,
  Storage,
  AstConstant
};

import * as Ast from "./ast";
export { Ast };

import * as Compiler from "./compiler";
export { Compiler };

import * as Compilations from "./compilations";
export { Compilations };

import * as Contexts from "./contexts";
export { Contexts };

import * as Conversion from "./conversion";
export { Conversion };

import type * as Pointer from "./pointer";
export type { Pointer };

import * as Evm from "./evm";
export { Evm };

import * as Export from "./export";
export { Export };

import * as Wrap from "./wrap";
export { Wrap };
