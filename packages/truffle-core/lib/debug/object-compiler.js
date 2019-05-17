const { promisify } = require("util");
const compile = require("truffle-compile");
const find_contracts = require("truffle-contract-sources");
const fs = require("fs");

// this class copes with a directory of .sol files each if which
// becomes a property of an object which is then compiled
// the imports in these files will be in the form
// import "file"
// rather than import "file.sol"
class DebugObjectCompiler {
  constructor(config) {
    this.config = config;
  }
  async compile() {
    // all the file names
    const filePaths = await promisify(find_contracts)(
      this.config.contracts_directory
    );
    // this is an object containing solidity code as properties
    // hence imports can be without the .sol extension
    const objectToCompile = await Promise.all(
      filePaths.map(filePath =>
        promisify(fs.readFile)(filePath).then(text => ({
          filePath,
          text
        }))
      )
    ).then(files =>
      files.reduce((acc, { filePath, text }) => {
        // nasty mutate as no object spread operator
        // regexes just get filename from full path and strip extension
        acc[
          filePath.replace(/^.*[\\/]/, "").replace(/\.[^/.]+$/, "")
        ] = text.toString();
        return acc;
      }, {})
    );
    const { contracts, files } = await new Promise((accept, reject) => {
      //we need to set up a config object for the compiler.
      //it's the same as the existing config, but we turn on quiet.
      //unfortunately, we don't have Babel here, so cloning is annoying.
      let compileConfig = Object.assign(
        {},
        ...Object.entries(this.config).map(([key, value]) => ({ [key]: value }))
      ); //clone
      compileConfig.quiet = true;

      compile(objectToCompile, compileConfig, (err, contracts, files) => {
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
  DebugObjectCompiler
};
