// must polyfill AbortController to use axios >=0.20.0, <=0.27.2 on node <= v14.x
import { AbortController, AbortSignal } from "node-abort-controller";

// we're using the "dom" lib in this package, so these types are already
// defined, but their implementations are nonexistent when running under node <=
// v15.x, so we polyfill them here anyway

if (typeof (global as any).AbortController === "undefined") {
  (global as any).AbortController = AbortController;
  (global as any).AbortSignal = AbortSignal;
}
