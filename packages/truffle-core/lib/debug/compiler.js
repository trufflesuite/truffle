const compile = require("truffle-compile");

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

    // since `compile.all()` returns two results, we can't use promisify
    // and are instead stuck with using an explicit Promise constructor
    const { contracts, files } = await new Promise((accept, reject) => {
      compile.all(compileConfig, (err, contracts, files) => {
        if (err) {
          return reject(err);
        }

        return accept({ contracts, files });
      });
    });

    return { contracts, files };
  }
}

module.exports = {
  DebugCompiler
};
