const CompilerSupplier = require("./compilerSupplier");
const semver = require("semver");
const Profiler = require("./profiler");
const { normalizeOptions } = require("./normalizeOptions");
const fse = require("fs-extra");
const { run } = require("./run");

const getSemverExpression = source => {
  return source.match(/pragma solidity(.*);/)[1].trim();
};

const getSemverExpressions = sources => {
  return sources.map(source => {
    return getSemverExpression(source);
  });
};

const determineSolcVersionRange = ranges => {
  const splitRanges = ranges.map(range => range.split("||"));
  const singletons = splitRanges.map(list => list.map(x => [x.trim()]));
  const tuples = singletons.reduce(
    (list1, list2) => {
      const pairs = [];
      for (const l1 of list1) {
        for (const l2 of list2) {
          pairs.push([...l1, ...l2]);
        }
      }
      return pairs;
    },
    [[]]
  );
  const disjuncts = tuples.map(tuple => tuple.join(" "));
  return disjuncts.join(" || ");
};

const findNewestSatisfyingVersion = ({ solcReleases, versionRange }) => {
  // releases are ordered from newest to oldest
  const version = solcReleases.find(version =>
    semver.satisfies(version, versionRange)
  );
  if (typeof version === "undefined") {
    throw new Error(`
      Could not find a version of the Solidity compiler that satisfies all
      of the pragma statements for ${source} and its dependencies.
    `);
  }
  return version;
};

const compileWithPragmaAnalysis = async ({ paths, options }) => {
  const supplierOptions = {
    events: options.events,
    solcConfig: options.compilers.solc
  };
  const compilerSupplier = new CompilerSupplier(supplierOptions);
  const { releases } = await compilerSupplier.getReleases();

  const dependencies = {};
  // for each source, collect all its dependencies
  for (const path of paths) {
    const source = await fse.readFile(path, "utf8");
    const parserVersion = findNewestSatisfyingVersion({
      solcReleases: releases,
      versionRange: getSemverExpression(source)
    });

    const { allSources } = await Profiler.requiredSourcesForSingleFile(
      options.with({
        path,
        base_path: options.contracts_directory,
        resolver: options.resolver,
        compilers: {
          solc: {
            version: parserVersion
          }
        }
      })
    );
    dependencies[path] = allSources;
  }

  const semverExpressions = {};
  // for each group of sources, collect all the semver expression from pragmas
  // key is a source - value is an array of pragmas
  for (const source of Object.keys(dependencies)) {
    const deps = Object.values(dependencies[source]);
    semverExpressions[source] = await getSemverExpressions(deps);
  }

  const solcVersionRange = {};
  // for each pragma group, determine the most recent satisfying version
  // key is source - value is a version of the Solidity compiler
  for (const source of Object.keys(semverExpressions)) {
    solcVersionRange[source] = determineSolcVersionRange(
      semverExpressions[source]
    );
  }

  const versionsToUse = {};
  for (const source of Object.keys(solcVersionRange)) {
    versionsToUse[source] = findNewestSatisfyingVersion({
      solcReleases: releases,
      versionRange: solcVersionRange[source]
    });
  }

  let compilations = [];
  for (const source of Object.keys(versionsToUse)) {
    const compilationOptions = options.merge({
      compilers: {
        solc: {
          version: versionsToUse[source]
        }
      }
    });

    const compilation = await run(
      dependencies[source],
      normalizeOptions(compilationOptions)
    );
    if (compilation.contracts.length > 0) {
      compilations.push(compilation);
    }
  }
  return { compilations };
};

module.exports = {
  compileWithPragmaAnalysis
};
