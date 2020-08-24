// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

const debug = require("debug")("compile:profiler");
const Common = require("@truffle/compile-common");
const { loadParser } = require("./loadParser");
const { shouldIncludePath } = require("./shouldIncludePath");
const { polycallbackify } = require("./polycallbackify");

module.exports = {
  updated: polycallbackify({
    asyncFunction: async options => {
      const profiler = await new Common.Profiler({});
      return await profiler.updated(options);
    }
  }),

  // Returns the minimal set of sources to pass to solc as compilations targets,
  // as well as the complete set of sources so solc can resolve the comp targets' imports.
  required_sources: polycallbackify({
    asyncFunction: async options => {
      // get parser
      const parseImports = await loadParser(options);

      // generate profiler
      const profiler = new Common.Profiler({
        parseImports,
        shouldIncludePath
      });

      // invoke profiler
      return await profiler.requiredSources(options);
    },
    resultArgs: ({ allSources, compilationTargets }) => [
      allSources,
      compilationTargets
    ]
  })
};
