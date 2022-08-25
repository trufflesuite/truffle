import { CompilerSupplier } from "./compilerSupplier";
import Config from "@truffle/config";
import semver from "semver";
import { Profiler } from "./profiler";
import { run } from "./run";
import { reportSources } from "./reportSources";
import type { Compilation } from "@truffle/compile-common";
import OS from "os";
import cloneDeep from "lodash/cloneDeep";

const getSemverExpression = source => {
  const result = source.match(/pragma solidity(.*);/);
  return result && result[1] ? result[1].trim() : undefined;
};

const getSemverExpressions = sources => {
  return sources
    .map(source => getSemverExpression(source))
    .filter(expression => expression);
};

const validateSemverExpressions = semverExpressions => {
  for (const expression of semverExpressions) {
    if (semver.validRange(expression) === null) {
      const message =
        `Invalid semver expression (${expression}) found in ` +
        `one of your contract's imports.`;
      throw new Error(message);
    }
  }
};

// takes an array of versions and an array of semver expressions
// returns a version of the compiler or undefined if none can be found
const findNewestSatisfyingVersion = ({ solcReleases, semverExpressions }) => {
  // releases are ordered from newest to oldest
  return solcReleases.find(version => {
    return semverExpressions.every(expression =>
      semver.satisfies(version, expression)
    );
  });
};

const throwCompilerVersionNotFound = ({ path, semverExpressions }) => {
  const message =
    `Could not find a single version of the Solidity compiler that ` +
    `satisfies the following semver expressions obtained from your source ` +
    `files' pragma statements: ${semverExpressions.join(" - ")}. ` +
    `${OS.EOL}Please check the pragma statements for ${path} and its imports.`;
  throw new Error(message);
};

export const compileWithPragmaAnalysis = async ({
  paths,
  options
}: {
  paths: string[];
  options: Config;
}) => {
  //don't compile if there's yul
  const yulPath = paths.find(path => path.endsWith(".yul"));
  if (yulPath !== undefined) {
    throw new Error(
      `Paths to compile includes Yul source ${yulPath}.  ` +
        `Pragma analysis is not supported when compiling Yul.`
    );
  }
  const filteredPaths = paths.filter(
    path => path.endsWith(".sol") || path.endsWith(".json")
  );
  if (filteredPaths.length === 0) {
    return { compilations: [] };
  }
  // construct supplier options for fetching list of solc versions;
  // enforce no Docker because listing Docker versions is slow (Docker Hub API
  // paginates responses, with >500 pages at time of writing)
  const supplierOptions = {
    events: options.events,
    solcConfig: {
      ...options.compilers.solc,
      docker: false
    }
  };
  const compilerSupplier = new CompilerSupplier(supplierOptions);
  const { releases } = await compilerSupplier.list();

  // collect sources by the version of the Solidity compiler that they require
  const versionsAndSources = {};
  for (const path of filteredPaths) {
    const source = (await options.resolver.resolve(path)).body;

    const parserVersion = findNewestSatisfyingVersion({
      solcReleases: releases,
      semverExpressions: [getSemverExpression(source)]
    });
    if (!parserVersion) {
      const m =
        `Could not find a valid pragma expression in ${path}. To use the ` +
        `"pragma" compiler setting your contracts must contain a pragma ` +
        `expression.`;
      throw new Error(m);
    }

    // allSources is of the format { [filename]: string }
    const { allSources } = await Profiler.requiredSourcesForSingleFile(
      options.with({
        path,
        base_path: options.contracts_directory,
        resolver: options.resolver,
        compiler: {
          name: "solc",
          version: parserVersion
        },
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

    // this really just validates the expressions from the contracts' imports
    // as it has already determined the parser version for each contract
    validateSemverExpressions(semverExpressions);

    const newestSatisfyingVersion = findNewestSatisfyingVersion({
      solcReleases: releases,
      semverExpressions
    });
    if (!newestSatisfyingVersion) {
      throwCompilerVersionNotFound({
        path,
        semverExpressions
      });
    }

    versionsAndSources[newestSatisfyingVersion] = {
      ...versionsAndSources[newestSatisfyingVersion],
      ...allSources
    };
  }

  reportSources({ paths: filteredPaths, options });

  const compilations: Compilation[] = [];
  for (const compilerVersion in versionsAndSources) {
    const compilationOptions = {
      compilers: cloneDeep(options.compilers)
    };
    compilationOptions.compilers.solc.version = compilerVersion;

    const config = Config.default().with(compilationOptions);
    const compilation = await run(versionsAndSources[compilerVersion], config);
    if (compilation && Object.keys(compilation.contracts).length > 0) {
      compilations.push(compilation);
    }
  }
  return { compilations };
};
