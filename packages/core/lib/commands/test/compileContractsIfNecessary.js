const Profiler = require("@truffle/compile-solidity/profiler");
const WorkflowCompile = require("@truffle/workflow-compile");

const compileContractsIfNecessary = async config => {
  const updated = (await Profiler.updated(config)) || [];
  if (updated.length === 0) {
    return;
  }

  const compiler =
    config.compileNone || config["--compile-none"] ? "none" : config.compiler;

  let compileConfig = config.with({
    all: config.compileAll === true,
    compiler,
    files: updated,
    quiet: config.runnerOutputOnly || config.quiet
  });

  // Compile project contracts and test contracts
  await WorkflowCompile.compileAndSave(compileConfig);
};

module.exports = {
  compileContractsIfNecessary
};
