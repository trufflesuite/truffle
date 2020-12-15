const Utils = require("@truffle/contract/lib/utils");
const assert = require("assert");
const whitelist = [
  "from",
  "to",
  "gas",
  "gasPrice",
  "value",
  "data",
  "nonce",
  "privateFor",
  "overwrite"
];

describe("isTxParams(val)", () => {
  it("returns false if the input is not an object", () => {
    const result = Utils.isTxParams(666);
    assert.equal(result, false);
  });
  it("returns true if a key is in the tx param whitelist", () => {
    assert.equal(
      whitelist.every(key => Utils.isTxParams({ [key]: "arbitraryValue" })),
      true
    );
  });
  it("returns false if no key matches anything in the whitelist", () => {
    const result = Utils.isTxParams({ shiny: true, ready: false });
    assert.equal(result, false);
  });
});
