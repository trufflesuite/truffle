const debug = require("debug")("compile-vyper:profiler");
const Common = require("@truffle/compile-common");
const Resolver = require("@truffle/resolver");
const { execVyperJson } = require("./vyper-json");
const { parseImports } = require("./parser");

// Returns the minimal set of sources to pass to solc as compilations targets,
// as well as the complete set of sources so solc can resolve the comp targets' imports.
async function requiredSources(options) {
  const resolver = new Resolver(options, {
    translateJsonToSolidity: false
  });

  debug("resolver.sources.length: %d", resolver.sources.length);

  // generate profiler
  const profiler = new Common.Profiler({
    parseImports: source =>
      parseImports(
        //note: returns a Promise
        source,
        execVyperJson,
        resolver
      ),
    shouldIncludePath
  });

  // invoke profiler
  return await profiler.requiredSources(options.with({ resolver }));
}

function shouldIncludePath(path) {
  return path.match(/\.(vy|json|v\.py|vyper\.py)$/) !== null;
}

module.exports = {
  requiredSources
};
