const BlockchainUtils = require("../index");
const assert = require("assert");

describe("BlockchainUtils.parse", () => {
  it("returns empty parsed object if uri doesn't start with blockchain://", () => {
    const parsed = BlockchainUtils.parse("notBlockchain://");
    assert.deepStrictEqual(parsed, {});
  });
});
