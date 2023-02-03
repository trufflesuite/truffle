const assert = require("chai").assert;
const fs = require("fs-extra");
const path = require("path");
const tmp = require("tmp");
const TruffleConfig = require("@truffle/config");
const {
  deriveConfigEnvironment,
  parseQuotesAndEscapes
} = require("../../lib/command-utils");

let config;

function createSandbox(source) {
  if (!fs.existsSync(source)) {
    throw new Error(`Sandbox failed: source: ${source} does not exist`);
  }

  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  fs.copySync(source, tempDir.name);
  const config = TruffleConfig.load(
    path.join(tempDir.name, "truffle-config.js"),
    {}
  );
  return config;
}

describe("command-utils", function () {
  before(function () {
    config = createSandbox(
      path.join(__dirname, "..", "sources", "command-utils")
    );
  });

  describe("deriveConfigEnvironment", function () {
    it("returns a config with specified network object having a provider property", function () {
      const expectedNetworkConfig = config.networks.crazyTimeNetwork;
      const cfg = deriveConfigEnvironment(
        config,
        "crazyTimeNetwork",
        undefined
      );
      assert.equal(
        cfg.networks.crazyTimeNetwork.confirmations,
        expectedNetworkConfig.confirmations
      );
      assert.equal(
        cfg.networks.crazyTimeNetwork.customUserProperty,
        expectedNetworkConfig.customUserProperty
      );
      assert.equal(
        cfg.networks.crazyTimeNetwork.provider,
        expectedNetworkConfig.provider
      );
    });

    it("returns a config with a network object having the specified url property ", function () {
      const testUrl = "http://localhost:5555";
      const cfg = deriveConfigEnvironment(config, "anyTimeNetwork", testUrl);
      assert.equal(cfg.networks["anyTimeNetwork"].url, testUrl);
    });

    it("returns a config with a network object having user specified properties", function () {
      const expectedNetworkConfig = config.networks.funTimeNetwork;
      const cfg = deriveConfigEnvironment(config, "funTimeNetwork", undefined);
      assert.equal(
        cfg.networks.funTimeNetwork.host,
        expectedNetworkConfig.host
      );
      assert.equal(
        cfg.networks.funTimeNetwork.port,
        expectedNetworkConfig.port
      );
      assert.equal(
        cfg.networks.funTimeNetwork.confirmations,
        expectedNetworkConfig.confirmations
      );
      assert.equal(
        cfg.networks.funTimeNetwork.customUserProperty,
        expectedNetworkConfig.customUserProperty
      );
    });

    it("returns a config with a dashboard network object having user specified properties", function () {
      const expectedNetworkConfig = config.networks.dashboard;
      const cfg = deriveConfigEnvironment(config, "dashboard", undefined);
      assert.equal(cfg.networks.dashboard.url, expectedNetworkConfig.url);
      assert.equal(
        cfg.networks.dashboard.confirmations,
        expectedNetworkConfig.confirmations
      );
      assert.equal(
        cfg.networks.dashboard.customUserProperty,
        expectedNetworkConfig.customUserProperty
      );
    });

    it("returns a config with a develop network object having default managed Ganache properties", function () {
      const cfg = deriveConfigEnvironment(config, "develop", undefined);
      assert.equal(cfg.networks.develop.network_id, 5777);
    });
  });

  describe("parseQuotesAndEscapes", function () {
    it("splits on whitespace", function () {
      const parsed = parseQuotesAndEscapes("  abc  def  ghi  ");
      assert.deepEqual(parsed, ["abc", "def", "ghi"]);
    });
    it("respects quotes and escapes", function () {
      const parsed = parseQuotesAndEscapes("abc'd \"e'\"f 'g\"\\ hi");
      assert.deepEqual(parsed, ["abcd \"ef 'g hi"]);
    });
    it("escapes correctly outside of a quote", function () {
      const parsed = parseQuotesAndEscapes("ab\\c\\'\\\"\\\\ ");
      assert.deepEqual(parsed, ["ab'\"\\"]);
    });
    it("escapes correctly inside a double-quote", function () {
      const parsed = parseQuotesAndEscapes('"ab\\"c\\d"');
      assert.deepEqual(parsed, ['ab"c\\d']);
    });
    it("does not escape inside a single quote", function () {
      const parsed = parseQuotesAndEscapes("'abc\\'");
      assert.deepEqual(parsed, ["abc\\"]);
    });
    it("allows custom escapes", function () {
      const parsed = parseQuotesAndEscapes("abc\\ de` f^ g `^^`", "^`");
      assert.deepEqual(parsed, ["abc\\", "de f g", "^`"]);
    });
    it("errors on mismatched double quote", function () {
      try {
        parseQuotesAndEscapes('"abc\\"');
      } catch (error) {
        if (error.message !== 'Error: quote with " not terminated') {
          throw error;
        }
      }
    });
    it("errors on mismatched single quote", function () {
      try {
        parseQuotesAndEscapes("'abc");
      } catch (error) {
        if (error.message !== "Error: quote with ' not terminated") {
          throw error;
        }
      }
    });
    it("errors on escaped end-of-line", function () {
      try {
        parseQuotesAndEscapes("abc\\");
      } catch (error) {
        if (error.message !== "Error: line ended with escape character \\") {
          throw error;
        }
      }
    });
  });
});
