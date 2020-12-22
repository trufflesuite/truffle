const assert = require("assert");
const { checkPluginConfig } = require("../lib/commands/run/checkPluginConfig");

describe("checkPluginConfig", () => {
  it("throws when passed an options.plugins non-array or empty array value", () => {
    const noPluginsError = /No plugins detected in the configuration file/;
    const incorrectConfigError = /Plugins configured incorrectly/;

    assert.throws(() => {
      checkPluginConfig({ plugins: "string" });
    }, incorrectConfigError);
    assert.throws(() => {
      checkPluginConfig({ plugins: 1234 });
    }, incorrectConfigError);
    assert.throws(() => {
      checkPluginConfig({ plugins: { foo: "bar" } });
    }, incorrectConfigError);
    assert.throws(() => {
      checkPluginConfig({ plugins: [] });
    }, incorrectConfigError);
    assert.throws(() => {
      checkPluginConfig({ plugins: null });
    }, noPluginsError);
    assert.throws(() => {
      checkPluginConfig({ plugins: undefined });
    }, noPluginsError);
  });

  it("does not throw when passed a valid options.plugins array value", () => {
    assert.doesNotThrow(() => checkPluginConfig({ plugins: ["truffle-test"] }));
  });
});
