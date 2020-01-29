const expect = require("../index");
const assert = require("assert");

// object being testing
const options = {
  example: "exists",
  another: 5
};

describe("expect.one", () => {
  it("throws when given key values are undefined", () => {
    assert.throws(
      () => expect.options(options, ["optional_key", "other_optional_key"]),
      "Should have thrown!"
    );
  });
});
