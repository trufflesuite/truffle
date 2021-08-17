/**
 * For allocation, encoding, and decoding of locations related to the ABI
 * (calldata in Solidity, events, etc.)
 *
 * @category ABI data location
 *
 * @packageDocumentation
 */

import * as Allocate from "./allocate";
export { Allocate };

import * as Encode from "./encode";
export { Encode };

import * as Decode from "./decode";
export { Decode };

import * as Import from "./import";
export { Import };

export * from "./types"; //can't do 'export type *'

import * as Utils from "./utils";
export { Utils };
