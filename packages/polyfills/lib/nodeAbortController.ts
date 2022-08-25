/*
 * Applies the "node-abort-controller" polyfill.
 *
 * Version info:
 *
 * Versioning on this one is a bit weird. The earliest node version where this
 * feature is available is v14.17.0, per
 * https://nodejs.org/en/blog/release/v14.17.0/#experimental-support-for-abortcontroller-and-abortsignal.
 *
 * However the global types weren't added to `@types/node` until v15.0.0, per
 * https://github.com/DefinitelyTyped/DefinitelyTyped/pull/52357#discussion_r614266767,
 * and at time of writing, those types are not yet included in any TS `lib`
 * version (see https://github.com/microsoft/TypeScript/issues/43692).
 *
 * This polyfill is not required for browser code. It is however required when
 * using axios >=0.20.0, <=0.27.2 on node < v14.17.0.
 */

import {
  AbortController as PolyfillAbortController,
  AbortSignal as PolyfillAbortSignal
} from "node-abort-controller";

declare global {
  interface AbortController extends PolyfillAbortController {}
  interface AbortSignal extends PolyfillAbortSignal {}

  var AbortController: PolyfillAbortController;
  var AbortSignal: PolyfillAbortSignal;
}

if (typeof (global as any).AbortController === "undefined") {
  (global as any).AbortController = PolyfillAbortController;
  (global as any).AbortSignal = PolyfillAbortSignal;
}

export {};
