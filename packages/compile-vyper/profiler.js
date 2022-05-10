const debug = require("debug")("compile-vyper:profiler");
const { Profiler } = require("@truffle/profiler");
const { Resolver } = require("@truffle/resolver");
const { parseImports } = require("./parser");

// Returns the minimal set of sources to pass to vyper-json as compilations targets,
// as well as the complete set of sources so vyper-json can resolve the comp targets' imports.
async function requiredSources(options) {
  const resolver = new Resolver(options);

  debug("resolver.sources.length: %d", resolver.sources.length);

  // generate profiler
  const profiler = new Profiler({
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
