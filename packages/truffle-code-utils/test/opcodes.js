const opcodes = require("../dist/opcodes");
const assert = require("assert");

describe("opcode parsing method", () => {
  it(`returns "INVALID" when passed an invalid opcode`, () => {
    const returnValue = opcodes(0xbad);
    assert.strictEqual("INVALID", returnValue);
  });
});
