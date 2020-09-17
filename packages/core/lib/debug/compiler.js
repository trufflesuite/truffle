const { Compile } = require("@truffle/compile-solidity");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile(sources = undefined) {
    const compileConfig = this.config.with({ quiet: true });

    const { compilations } = sources
      ? await Compile.sources({ sources, options: compileConfig }) //used by external.js
      : await Compile.all(compileConfig);

    return compilations.reduce(
      (a, compilation) => {
        a.contracts = a.contracts.concat(compilation.contracts);
        a.sourceIndexes = a.sourceIndexes.concat(compilation.sourceIndexes);
        return a;
      },
      {
        contracts: [],
        sourceIndexes: []
      }
    );
  }
}

module.exports = {
  DebugCompiler
};
