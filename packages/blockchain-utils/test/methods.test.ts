import BlockchainUtils from "../";
import assert from "assert";
import { describe, it } from "mocha";

describe("BlockchainUtils.parse", () => {
  it("returns empty parsed object if uri doesn't start with blockchain://", () => {
    const parsed = BlockchainUtils.parse("notBlockchain://");
    assert.deepEqual(parsed, {});
  });
});
