import { parseOpcode } from "../src/opcodes";
import assert from "assert";
import { describe, it } from "mocha";

describe("opcode parsing method", function () {
  it(`returns "INVALID" when passed an invalid opcode`, function () {
    const returnValue = parseOpcode(0xbad);
    assert.strictEqual("INVALID", returnValue);
  });
});
