import type { Web3Shim } from "..";

// We simply return plain ol' Web3.js
export const Web3JsDefinition = {
  async initNetworkType(_: Web3Shim) {}
};
