const debug = require("debug")("compile-vyper:profiler");
const Common = require("@truffle/compile-common");
const Resolver = require("@truffle/resolver");
const { parseImports } = require("./parser");

// Returns the minimal set of sources to pass to solc as compilations targets,
// as well as the complete set of sources so solc can resolve the comp targets' imports.
async function requiredSources(options) {
  const resolver = new Resolver(options, {
    translateJsonToSolidity: false,
    resolveVyperModules: true
  });

  debug("resolver.sources.length: %d", resolver.sources.length);

  // generate profiler
  const profiler = new Common.Profiler({
    parseImports,
    shouldIncludePath
  });

  // invoke profiler
  debug("invoking profiler");
  return await profiler.requiredSources(options.with({ resolver }));
}

function shouldIncludePath(path) {
  return path.match(/\.(vy|json|v\.py|vyper\.py)$/) !== null;
}

module.exports = {
  requiredSources
};
