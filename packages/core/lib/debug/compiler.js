const compile = require("@truffle/compile-solidity/new");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile() {
    const compileConfig = this.config.with({ quiet: true });

    const { contracts, sourceIndexes } = await compile.all(compileConfig);

    return { contracts, sourceIndexes };
  }
}

module.exports = {
  DebugCompiler
};
