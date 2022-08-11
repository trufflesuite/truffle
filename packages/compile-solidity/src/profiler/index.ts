// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.
import { Profiler } from "@truffle/profiler";
import { loadParser } from "./loadParser";
import { shouldIncludePath } from "./shouldIncludePath";
import type Config from "@truffle/config";

export default {
  updated: async (options: Config) => {
    const profiler = new Profiler({});
    return await profiler.updated(options);
  },

  // Returns the minimal set of sources to pass to solc as compilations targets,
  // as well as the complete set of sources so solc can resolve the comp targets' imports.
  requiredSources: async (options: Config) => {
    // get parser
    const parseImports = await loadParser(options);

    // generate profiler
    const profiler = new Profiler({
      parseImports,
      shouldIncludePath
    });

    // invoke profiler
    return await profiler.requiredSources(options);
  },

  requiredSourcesForSingleFile: async (options: Config) => {
    const parseImports = await loadParser(options);

    const profiler = new Profiler({
      parseImports,
      shouldIncludePath
    });

    return profiler.requiredSourcesForSingleFile(options);
  }
};
