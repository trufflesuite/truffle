import "@truffle/polyfills/lib/nodeAbortController";
import assert from "assert";

describe("@truffle/polyfills/dist/nodeAbortController", () => {
  it("should have an AbortController global", () => {
    assert.notStrictEqual(AbortController, undefined);
  });

  it("should have an AbortSignal global", () => {
    assert.notStrictEqual(AbortSignal, undefined);
  });
});
