import polyfillNames from "@truffle/polyfills";
import assert from "assert";

describe("@truffle/polyfill", () => {
  it("should not throw when programmatically importing all polyfills", () => {
    assert.doesNotThrow(() => {
      for (const polyfillName of polyfillNames) {
        require(`@truffle/polyfills/lib/${polyfillName}`);
      }
    });
  });
});
