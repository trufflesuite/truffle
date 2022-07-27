// must polyfill AbortController to use axios >=0.20.0, <=0.27.2 on node <= v14.x
import { AbortController, AbortSignal } from "node-abort-controller";

declare global {
  type AbortController = typeof AbortController;
  type AbortSignal = typeof AbortSignal;
}

if (typeof (global as any).AbortController === "undefined") {
  (global as any).AbortController = AbortController;
  (global as any).AbortSignal = AbortSignal;
}
