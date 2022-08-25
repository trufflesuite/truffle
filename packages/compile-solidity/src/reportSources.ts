import path from "path";

export const reportSources = ({ paths, options }) => {
  if (options.quiet !== true && options.events) {
    if (!Array.isArray(paths)) {
      paths = Object.keys(paths);
    }

    const blacklistRegex = /^truffle\//;

    const sources = paths
      .sort()
      .map(contract => {
        if (path.isAbsolute(contract)) {
          contract =
            "." + path.sep + path.relative(options.working_directory, contract);
        }
        if (contract.match(blacklistRegex) || contract.endsWith(".json")) {
          return;
        }
        return contract;
      })
      .filter(contract => contract);
    options.events.emit("compile:sourcesToCompile", {
      sourceFileNames: sources
    });
  }
};
