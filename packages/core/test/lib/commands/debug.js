const assert = require("chai").assert;
const { URL } = require("url");
const loadConfig = require("../../../lib/loadConfig");
const mergeConfigNetwork = require("../../../lib/mergeConfigNetwork");
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
    const url = "http://urlhost:1234";
    const parsedUrl = new URL(url);
    const expectedNetworkName = parsedUrl.host;

    beforeEach(function () {
      config = Config.default();
      options = { url };
    });

    it("should create networks item in config", function () {
      result = mergeConfigNetwork(config, options);

      assert.notEqual(result.networks[expectedNetworkName], undefined);
      assert.equal(result.networks[expectedNetworkName].url, url);
      assert.equal(result.networks[expectedNetworkName].network_id, "*");
    });

    it("should set host of the url by default", function () {
      result = mergeConfigNetwork(result, options);
      assert.equal(result.network, expectedNetworkName);
    });

    it("should override network field when specified in options", function () {
      options.network = "different_network";

      result = mergeConfigNetwork(config, options);
      assert.equal(result.network, "different_network");
    });

    it("should not use url when url not passed", function () {
      result = mergeConfigNetwork(config, {});
      assert.notEqual(result.netwok, expectedNetworkName);
    });
  });
});
