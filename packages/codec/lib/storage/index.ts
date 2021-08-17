/**
 * For allocation and decoding of storage variables
 *
 * @category Solidity data location
 *
 * @packageDocumentation
 */

export * from "./types"; //can't do 'export type *'

import * as Utils from "./utils";
export { Utils };

import * as Allocate from "./allocate";
export { Allocate };

import * as Decode from "./decode";
export { Decode };

import * as Read from "./read";
export { Read };
