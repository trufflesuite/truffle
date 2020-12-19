const assert = require("assert");
const { checkPluginConfig } = require("../lib/commands/run/checkPluginConfig");
const TruffleError = require("@truffle/error");

describe("checkPluginConfig", () => {
  it("throws when passed an options.plugins non-array or empty array value", () => {
    assert.throws(
      () => {
        checkPluginConfig({ plugins: "string" });
      },
      TruffleError,
      "TruffleError not thrown!"
    );
    assert.throws(
      () => {
        checkPluginConfig({ plugins: 1234 });
      },
      TruffleError,
      "TruffleError not thrown!"
    );
    assert.throws(
      () => {
        checkPluginConfig({ plugins: { foo: "bar" } });
      },
      TruffleError,
      "TruffleError not thrown!"
    );
    assert.throws(
      () => {
        checkPluginConfig({ plugins: [] });
      },
      TruffleError,
      "TruffleError not thrown!"
    );
    assert.throws(
      () => {
        checkPluginConfig({ plugins: null });
      },
      TruffleError,
      "TruffleError not thrown!"
    );
    assert.throws(
      () => {
        checkPluginConfig({ plugins: undefined });
      },
      TruffleError,
      "TruffleError not thrown!"
    );
  });

  it("does not throw when passed a valid options.plugins array value", () => {
    assert.doesNotThrow(() => checkPluginConfig({ plugins: ["truffle-test"] }));
  });
});
