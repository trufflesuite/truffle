const { compile, Compile } = require("@truffle/compile-solidity");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile(sources = undefined) {
    const compileConfig = this.config.with({ quiet: true });

    const { contracts, sourceIndexes } = sources
      ? await compile(sources, compileConfig) //used by external.js
      : await Compile.all(compileConfig);

    return { contracts, sourceIndexes };
  }
}

module.exports = {
  DebugCompiler
};
