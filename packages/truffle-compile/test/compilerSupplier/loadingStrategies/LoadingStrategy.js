const assert = require("assert");
const {
  LoadingStrategy
} = require("../../../compilerSupplier/loadingStrategies");
let expectedDefaultConfig, loadingStrategyOptions;

describe("LoadingStrategy base class", () => {
  beforeEach(() => {
    loadingStrategyOptions = {
      version: null,
      events: {
        emit: () => {}
      }
    };
    instance = new LoadingStrategy(loadingStrategyOptions);
    expectedDefaultConfig = {
      compilerRoots: [
        "https://relay.trufflesuite.com/solc/bin/",
        "https://solc-bin.ethereum.org/bin/",
        "https://ethereum.github.io/solc-bin/bin/"
      ],
      dockerTagsUrl:
        "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/"
    };
  });

  it("has a config with some default values", () => {
    const { compilerRoots, dockerTagsUrl } = instance.config;
    assert.deepEqual(compilerRoots, expectedDefaultConfig.compilerRoots);
    assert(dockerTagsUrl === expectedDefaultConfig.dockerTagsUrl);
  });
});
