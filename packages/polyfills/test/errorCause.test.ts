import assert from "assert";
import "@truffle/polyfills/lib/errorCause";

describe("@truffle/polyfills/dist/errorCause", () => {
  it("should have a cause property", () => {
    const cause = new Error("bar");
    const error = new Error("foo", { cause });
    assert.strictEqual(error.cause, cause);
  });
});

void 0;
