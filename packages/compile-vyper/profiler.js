const debug = require("debug")("compile-vyper:profiler");
const Common = require("@truffle/compile-common");
const { execVyperJson } = require("./vyper-json");
const { parseImports } = require("./parser");

// Returns the minimal set of sources to pass to solc as compilations targets,
// as well as the complete set of sources so solc can resolve the comp targets' imports.
async function requiredSources(options) {
  // generate profiler
  const profiler = new Common.Profiler({
    parseImports: source => parseImports(source, execVyperJson), //implicitly async
    shouldIncludePath
  });

  // invoke profiler
  // TODO: add new resolver here
  return await profiler.requiredSources(options);
}

function shouldIncludePath(path) {
  return path.match(/\.(vy|json|v\.py|vyper\.py)$/) !== null;
}

module.exports = {
  requiredSources
};
