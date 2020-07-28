const compile = require("@truffle/compile-solidity/new");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile(sources = undefined) {
    const compileConfig = this.config.with({ quiet: true });

    const { contracts, sourceIndexes } = sources
      ? await compile(sources, compileConfig) //used by external.js
      : await compile.all(compileConfig);

    return { contracts, sourceIndexes };
  }
}

module.exports = {
  DebugCompiler,
};
