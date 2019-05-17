const compile = require("truffle-compile");
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
    const fileNames = await new Promise((resolve, reject) =>
      fs.readdir(`${this.config.working_directory}/contracts`, function(
        err,
        filePaths
      ) {
        if (err) {
          return reject(err);
        }
        return resolve(filePaths);
      })
    );
    // this is an object containing solidity code as properties
    // hence imports can be without the .sol extension
    const objectToCompile = await Promise.all(
      fileNames.map(file =>
        new Promise((resolve, reject) =>
          fs.readFile(
            `${this.config.working_directory}/contracts/${file}`,
            (err, text) => {
              if (err) {
                return reject(err);
              }
              resolve(text);
            }
          )
        ).then(text => ({
          file,
          text
        }))
      )
    ).then(files =>
      files.reduce((acc, { file, text }) => {
        // nasty mutate as no object spread operator
        acc[file.substring(0, file.indexOf(".sol"))] = text.toString();
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
