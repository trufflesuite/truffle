const { Compile } = require("@truffle/compile-solidity");
const WorkflowCompile = require("@truffle/workflow-compile");

class DebugCompiler {
  constructor(config) {
    this.config = config;
  }

  async compile(sources = undefined) {
    const compileConfig = this.config.with({ quiet: true });

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
