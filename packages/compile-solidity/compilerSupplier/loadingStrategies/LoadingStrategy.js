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

  errors(kind, input, error) {
    const info = "Run `truffle compile --list` to see available versions.";

    const kinds = {
      noPath: "Could not find compiler at: " + input,
      noVersion:
        `Could not find a compiler version matching ${input}. ` +
        `Please ensure you are specifying a valid version, constraint or ` +
        `build in the truffle config. ${info}`,
      noRequest:
        "Failed to complete request to: " +
        input +
        ". Are you connected to the internet?\n\n" +
        error,
      noUrl: "compiler root URL missing",
      noDocker:
        "You are trying to run dockerized solc, but docker is not installed.",
      noImage:
        "Please pull " +
        input +
        " from docker before trying to compile with it.",
      noNative: "Could not execute local solc binary: " + error,
      noString:
        "`compilers.solc.version` option must be a string specifying:\n" +
        "   - a path to a locally installed solcjs\n" +
        "   - a solc version or range (ex: '0.4.22' or '^0.5.0')\n" +
        "   - a docker image name (ex: 'stable')\n" +
        "   - 'native' to use natively installed solc\n" +
        "Received: " +
        input +
        " instead."
    };

    return new Error(kinds[kind]);
  }

  load(_userSpecification) {
    throw new Error(
      "Abstract method LoadingStrategy.load is not implemented for this strategy."
    );
  }

  markListeners() {
    return {
      uncaughtException: new Set(process.listeners("uncaughtException")),
      unhandledRejection: new Set(process.listeners("unhandledRejection")),
    };
  }

  /**
   * Cleans up error listeners left by soljson
   * Use with `markListeners()`
   */
  removeListener(markedListeners) {
    for (const eventName in markedListeners) {
      const marked = markedListeners[eventName];
      for (const listener of process.listeners(eventName)) {
        if (!marked.has(listener)) {
          process.removeListener(eventName, listener);
        }
      }
    }
  }
};

module.exports = LoadingStrategy;
