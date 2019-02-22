const assert = require("assert");
const {
  LoadingStrategy
} = require("../../../compilerSupplier/loadingStrategies");
let expectedDefaultConfig;

describe("LoadingStrategy base class", () => {
  beforeEach(() => {
    instance = new LoadingStrategy();
    expectedDefaultConfig = {
      versionsUrl: "https://solc-bin.ethereum.org/bin/list.json",
      compilerUrlRoot: "https://solc-bin.ethereum.org/solc/bin/",
      versionsFallbackUrl: "https://relay.trufflesuite.com/solc/bin/list.json",
      compilerFallbackUrlRoot: "https://relay.trufflesuite.com/solc/bin/",
      dockerTagsUrl:
        "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/"
    };
  });

  it("has a config with some default values", () => {
    const {
      versionsUrl,
      compilerUrlRoot,
      versionsFallbackUrl,
      compilerFallbackUrlRoot,
      dockerTagsUrl
    } = instance.config;
    assert(versionsUrl === expectedDefaultConfig.versionsUrl);
    assert(compilerUrlRoot === expectedDefaultConfig.compilerUrlRoot);
    assert(versionsFallbackUrl === expectedDefaultConfig.versionsFallbackUrl);
    assert(
      compilerFallbackUrlRoot === expectedDefaultConfig.compilerFallbackUrlRoot
    );
    assert(dockerTagsUrl === expectedDefaultConfig.dockerTagsUrl);
  });
});
