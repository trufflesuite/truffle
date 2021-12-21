const assert = require("chai").assert;
const {
  mergeConfigNetwork,
  loadConfig
} = require("../../../lib/commands/debug");
const Config = require("@truffle/config");
let config, result, options;

describe("debug", () => {
  describe("loadConfig(options)", () => {
    it("throws error when file not found", () => {
      options = {};
      assert.throws(() => {
        loadConfig(options);
      }, "Could not find suitable configuration file.");
    });

    describe("url option is specified", () => {
      it("loads default config with compileNone", () => {
        options = { url: "https://someUrl:8888" };
        result = loadConfig(options);
        assert.equal(result.compileNone, true);
        // options should also override compileNone
        assert.equal(options.compileNone, true);
        assert.equal(result.network, undefined);
      });
    });
  });

  describe("mergeConfigNetwork(config, options)", () => {
    beforeEach(() => {
      config = Config.default();
      options = {
        url: "http://urlhost:1234"
      };
    });

    it("should create networks item in config", () => {
      result = mergeConfigNetwork(config, options);

      assert.notEqual(result.networks.inline_config, undefined);
      assert.equal(result.networks.inline_config.url, "http://urlhost:1234");
      assert.equal(result.networks.inline_config.network_id, "*");
    });

    it("should set inline_network by default", () => {
      result = mergeConfigNetwork(result, options);
      assert.equal(result.network, "inline_config");
    });

    it("should override network field when specified in options", () => {
      options.network = "different_network";

      result = mergeConfigNetwork(config, options);
      assert.equal(result.network, "different_network");
    });
  });
});
