const expect = require("../index");
const assert = require("assert");

// object being testing
const options = {
  example: "exists",
  another: 5
};

describe("expect.options", () => {
  it("does nothing when expected key values exist", () => {
    assert.doesNotThrow(
      () => expect.options(options, ["example", "another"]),
      "Should not have thrown!"
    );
    assert.doesNotThrow(
      () => expect.options(options, ["another", "example"]),
      "Should not have thrown!"
    );
  });

  it("throws when passed an undefined key value", () => {
    assert.throws(
      () =>
        expect.options(options, ["example", "another", "missing_key_value"]),
      "Should have thrown!"
    );
    assert.throws(
      () =>
        expect.options(options, ["another", "missing_key_value", "example"]),
      "Should have thrown!"
    );
  });
});

describe("expect.one", () => {
  it("does nothing when at least one key value exists", () => {
    assert.doesNotThrow(
      () => expect.one(options, ["example", "optional_key"]),
      "Should not have thrown!"
    );
    assert.doesNotThrow(
      () =>
        expect.one(options, ["optional_key", "example", "other_optional_key"]),
      "Should not have thrown!"
    );
  });

  it("throws when all key values are undefined", () => {
    assert.throws(
      () => expect.options(options, ["optional_key", "other_optional_key"]),
      "Should have thrown!"
    );
    assert.throws(
      () =>
        expect.options(options, [
          "other_optional_key",
          "optional_key",
          "another_optional_key"
        ]),
      "Should have thrown!"
    );
  });
});
