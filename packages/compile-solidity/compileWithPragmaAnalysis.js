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
  return sources.map(source => getSemverExpression(source));
};

// takes an array of versions and an array of semver expressions
const findNewestSatisfyingVersion = ({ solcReleases, semverExpressions }) => {
  // releases are ordered from newest to oldest
  const version = solcReleases.find(version => {
    return semverExpressions.every(expression =>
      semver.satisfies(version, expression)
    );
  });
  if (typeof version === "undefined") {
    throw new Error(`
      Could not find a single version of the Solidity compiler that satisfies
      all of the pragma statements for ${source} and its dependencies.
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

  // for each source, collect all its dependencies and determine the newest
  // version of the Solidity compiler to use for compilation of the group
  const compilations = [];
  for (const path of paths) {
    const source = await fse.readFile(path, "utf8");
    const parserVersion = findNewestSatisfyingVersion({
      solcReleases: releases,
      semverExpressions: [getSemverExpression(source)]
    });

    // allSources is of the format { [filename]: string }
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

    // get an array of all the semver expressions in the sources
    const semverExpressions = await getSemverExpressions(
      Object.values(allSources)
    );
    const newestSatisfyingVersion = findNewestSatisfyingVersion({
      solcReleases: releases,
      semverExpressions
    });

    const compilationOptions = options.merge({
      compilers: {
        solc: {
          version: newestSatisfyingVersion
        }
      }
    });

    const compilation = await run(
      allSources,
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
