class LoadingStrategy {
  constructor(options) {
    const defaultConfig = {
      compilerRoots: [
        "https://relay.trufflesuite.com/solc/bin/",
        "https://solc-bin.ethereum.org/bin/",
        "https://ethereum.github.io/solc-bin/bin/"
      ],
      dockerTagsUrl:
        "https://registry.hub.docker.com/v2/repositories/ethereum/solc/tags/"
    };
    this.config = Object.assign({}, defaultConfig, options);
  }

  load(_userSpecification) {
    throw new Error(
      "Abstract method LoadingStrategy.load is not implemented for this strategy."
    );
  }
};

module.exports = LoadingStrategy;
