const compile = require("truffle-compile/new");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile() {
    //we need to set up a config object for the compiler.
    //it's the same as the existing config, but we turn on quiet.
    //unfortunately, we don't have Babel here, so cloning is annoying.
    const compileConfig = Object.assign(
      {},
      ...Object.entries(this.config).map(([key, value]) => ({ [key]: value }))
    ); //clone
    compileConfig.quiet = true;

    const { contracts, sourceIndexes } = await compile.all(compileConfig);

    return { contracts, sourceIndexes };
  }
}

module.exports = {
  DebugCompiler
};
