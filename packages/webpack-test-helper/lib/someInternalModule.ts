/**
 * This module is just used in the @truffle/webpack-test-helper tests to
 * validate that we can in fact read this module from the bundle, and that we
 * can mock its dependencies.
 */

import debugModule from "debug";

/**
 * A very simple function that just returns the string "bar"
 */
export function foo(): string {
  return "bar";
}

/**
 * The string "bar"
 */
export const constString: string = "bar";

/**
 * A function that creates an instance of the `debug` module using key
 * "webpack-test-helper:someInternalModule" and calls the debug instance with
 * the text "Hello world"
 */
export function usesDebugModule() {
  debugModule("webpack-test-helper:someInternalModule")("Hello world");
}
