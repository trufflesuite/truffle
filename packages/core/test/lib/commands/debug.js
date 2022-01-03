const assert = require("chai").assert;
const {
  mergeConfigNetwork,
  loadConfig
} = require("../../../lib/commands/debug");
const Config = require("@truffle/config");
let config, result, options;

describe("debug", function () {
  describe("loadConfig(options)", function () {
    it("throws error when file not found", function () {
      options = {};
      assert.throws(function () {
        loadConfig(options);
      }, "Could not find suitable configuration file.");
    });

    describe("url option is specified", function () {
      it("loads default config with compileNone", function () {
        options = { url: "https://someUrl:8888" };
        result = loadConfig(options);
        assert.equal(result.compileNone, true);
        assert.equal(result.configFileSkipped, true);
      });
    });
  });

  describe("mergeConfigNetwork(config, options)", function () {
    beforeEach(function () {
      config = Config.default();
      options = {
        url: "http://urlhost:1234"
      };
    });

    it("should create networks item in config", function () {
      result = mergeConfigNetwork(config, options);

      assert.notEqual(result.networks.inline_config, undefined);
      assert.equal(result.networks.inline_config.url, "http://urlhost:1234");
      assert.equal(result.networks.inline_config.network_id, "*");
    });

    it("should set inline_network by default", function () {
      result = mergeConfigNetwork(result, options);
      assert.equal(result.network, "inline_config");
    });

    it("should override network field when specified in options", function () {
      options.network = "different_network";

      result = mergeConfigNetwork(config, options);
      assert.equal(result.network, "different_network");
    });

    it("should not use url when url not passed", function () {
      result = mergeConfigNetwork(config, {});
      assert.notEqual(result.netwok, "inline_config");
    });
  });
});
