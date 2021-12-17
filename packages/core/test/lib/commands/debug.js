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
      mergeConfigNetwork(config, options);

      assert.notEqual(config.networks.inline_config, undefined);
      assert.equal(config.networks.inline_config.url, "http://urlhost:1234");
      assert.equal(config.networks.inline_config.network_id, "*");
    });

    it("should set inline_network by default", () => {
      mergeConfigNetwork(config, options);
      assert.equal(config.network, "inline_config");
    });

    it("should override network field when specified in options", () => {
      options.network = "different_network";

      mergeConfigNetwork(config, options);
      assert.equal(config.network, "different_network");
    });
  });
});
