/*
 * Applies the "error-cause" polyfill.
 *
 * Version info:
 *
 * Error causes (aka error chaining) were introduced by
 * tc39/proposal-error-cause [1] and accepted into the ECMAScript standard as of
 * ecma262 aka ES2022 [2].
 *
 * The feature was first added to node as of the v16.9.0 release [3].
 *
 * 1: https://github.com/tc39/proposal-error-cause
 * 2: https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-error-message
 * 3: https://nodejs.org/ja/blog/release/v16.9.0/#error-cause
 */

import shim from "error-cause/shim";

// modify the global types to include just the extra things we want by taking
// advantage of TypeScript's declaration merging feature
declare global {
  interface ErrorOptions {
    cause?: Error;
  }

  interface Error {
    cause?: Error;
  }

  interface ErrorConstructor {
    new (message?: string, options?: ErrorOptions): Error;
  }

  var Error: ErrorConstructor;

  interface EvalErrorConstructor {
    new (message?: string, options?: ErrorOptions): EvalError;
  }

  var EvalError: EvalErrorConstructor;

  interface RangeErrorConstructor {
    new (message?: string, options?: ErrorOptions): RangeError;
  }

  var RangeError: RangeErrorConstructor;

  interface ReferenceErrorConstructor {
    new (message?: string, options?: ErrorOptions): ReferenceError;
  }

  var ReferenceError: ReferenceErrorConstructor;

  interface SyntaxErrorConstructor {
    new (message?: string, options?: ErrorOptions): SyntaxError;
  }

  var SyntaxError: SyntaxErrorConstructor;

  interface TypeErrorConstructor {
    new (message?: string, options?: ErrorOptions): TypeError;
  }

  var TypeError: TypeErrorConstructor;

  interface URIErrorConstructor {
    new (message?: string, options?: ErrorOptions): URIError;
  }

  var URIError: URIErrorConstructor;
}

shim();

export {};
