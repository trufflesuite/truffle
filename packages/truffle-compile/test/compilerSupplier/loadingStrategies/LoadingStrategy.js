const assert = require("assert");
const {
  LoadingStrategy
} = require("../../../compilerSupplier/loadingStrategies");
let expectedDefaultConfig;

describe("LoadingStrategy base class", () => {
  beforeEach(() => {
    instance = new LoadingStrategy();
    expectedDefaultConfig = {
      versionsUrl: "https://ethereum.github.io/solc-bin/bin/list.json",
      compilerUrlRoot: "https://ethereum.github.io/solc-bin/bin/",
      dockerTagsUrl:
        "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/"
    };
  });

  it("has a config with some default values", () => {
    const { versionsUrl, compilerUrlRoot, dockerTagsUrl } = instance.config;
    assert(versionsUrl === expectedDefaultConfig.versionsUrl);
    assert(compilerUrlRoot === expectedDefaultConfig.compilerUrlRoot);
    assert(dockerTagsUrl === expectedDefaultConfig.dockerTagsUrl);
  });
});
