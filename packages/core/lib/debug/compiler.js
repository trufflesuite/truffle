const { Compile } = require("@truffle/compile-solidity");
const WorkflowCompile = require("@truffle/workflow-compile");
const Resolver = require("@truffle/resolver");
const glob = require("glob");
const path = require("path");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile({ sources, withTests }) {
    let compileConfig = this.config.with({ quiet: true });

    if (withTests) {
      const testResolver = new Resolver(this.config, {
        includeTruffleSources: true
      });
      const testFiles = glob
        .sync(`${this.config.test_directory}/**/*.sol`)
        .map(filePath => path.resolve(filePath));
      compileConfig = compileConfig.with({
        resolver: testResolver,
        //note we only need to pass *additional* files
        files: testFiles
      });
    }

    const { compilations } = sources
      ? await Compile.sources({ sources, options: compileConfig }) //used by external.js
      : await WorkflowCompile.compile(compileConfig.with({ all: true }));
    //note: we don't allow for the possibility here of compiling with specified sources
    //that are *not* solidity.  only external.js specifies sources, and making that work
    //with Vyper is a hard problem atm (how do we get the right version??)

    return compilations;
  }
}

module.exports = {
  DebugCompiler
};
