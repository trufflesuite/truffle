/**
 * Usage:
 *
 * ```
 * import { ... } from "@truffle/codec";
 * ```
 *
 * @module @truffle/codec
 *//** */

import * as Format from "@truffle/codec/format";
export { Format };

export * from "./interface";
export {
  ContractState, DecodedVariable, DecodedTransaction, DecodedLog, EventOptions
} from "./types/interface";

import * as Decoding from "./types/decoding";
export { Decoding };
// export * from "./types/errors";
