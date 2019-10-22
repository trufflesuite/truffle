/**
 * Usage:
 *
 * ```
 * import { ... } from "@truffle/codec";
 * ```
 *
 * @module @truffle/codec
 */ /** */

import * as Format from "@truffle/codec/format";
export { Format };

export * from "./interface";
export {
  ContractState,
  DecodedVariable,
  DecodedTransaction,
  DecodedLog,
  EventOptions
} from "./types/interface";

export {
  AbiArgument,
  CalldataDecoding,
  LogDecoding,
  AnonymousDecoding,
  ConstructorDecoding,
  EventDecoding,
  FunctionDecoding,
  MessageDecoding,
  UnknownDecoding
} from "./types/decoding";
// export * from "./types/errors";
