const compile = require("truffle-compile");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile() {
    const { contracts, files } = await new Promise((accept, reject) => {
      //we need to set up a config object for the compiler.
      //it's the same as the existing config, but we turn on quiet.
      //unfortunately, we don't have Babel here, so cloning is annoying.
      let compileConfig = Object.assign(
        {},
        ...Object.entries(this.config).map(([key, value]) => ({ [key]: value }))
      ); //clone
      compileConfig.quiet = true;

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
