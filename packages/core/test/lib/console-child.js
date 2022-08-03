const assert = require("chai").assert;
const fs = require("fs-extra");
const path = require("path");
const tmp = require("tmp");
const TruffleConfig = require("@truffle/config");
const { deriveConfigEnvironment } = require("../../lib/command-utils");

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

describe("console-child", function () {
  before("Create a sandbox", function () {
    config = createSandbox(
      path.join(__dirname, "..", "sources", "console-child")
    );
  });

  describe("deriveConfigEnvironment", function () {
    it("network has provider", function () {
      config.network = "crazyTimeNetwork";
      const expectedNetworkConfig = config.networks[config.network];
      const cfg = deriveConfigEnvironment(config, config.network, "");
      assert.equal(cfg.network, config.network);
      assert.equal(
        cfg.networks[config.network].confirmations,
        expectedNetworkConfig.confirmations
      );
    });

    it("url is specified instead of network", function () {
      config.network = "localhost:5555";
      const cfg = deriveConfigEnvironment(
        config,
        config.network,
        "http://localhost:5555"
      );
      const expectedNetworkConfig = config.networks[config.network];
      assert.equal(cfg.network, config.network);
      assert.equal(cfg.networks[config.network], expectedNetworkConfig);
    });

    it("network has host and port", function () {
      config.network = "funTimeNetwork";
      const expectedNetworkConfig = config.networks[config.network];
      const cfg = deriveConfigEnvironment(config, config.network, "");
      assert.equal(cfg.network, config.network);
      assert.equal(
        cfg.networks[config.network].host,
        expectedNetworkConfig.host
      );
      assert.equal(
        cfg.networks[config.network].port,
        expectedNetworkConfig.port
      );
      assert.equal(
        cfg.networks[config.network].confirmations,
        expectedNetworkConfig.confirmations
      );
    });

    it("network is dashboard", function () {
      config.network = "dashboard";
      const expectedNetworkConfig = config.networks[config.network];
      const cfg = deriveConfigEnvironment(config, config.network, "");
      assert.equal(cfg.network, config.network);
      assert.equal(cfg.networks[config.network].url, expectedNetworkConfig.url);
      assert.equal(
        cfg.networks[config.network].confirmations,
        expectedNetworkConfig.confirmations
      );
    });
  });
});
