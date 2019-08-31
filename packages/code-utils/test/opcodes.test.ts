import opcodes from "../opcodes";
import assert from "assert";
import { describe, it } from "mocha";

describe("opcode parsing method", () => {
  it(`returns "INVALID" when passed an invalid opcode`, () => {
    const returnValue = opcodes(0xbad);
    assert.strictEqual("INVALID", returnValue);
  });
});
