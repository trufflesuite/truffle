import debugModule from "debug";
const debug = debugModule("compile-common:profiler");
const findContracts = require("@truffle/contract-sources");
const expect = require("@truffle/expect");

import { updated } from "./updated";
import { UnresolvedSource } from "./resolveAllSources";
import { requiredSources, RequiredSourcesOptions } from "./requiredSources";
import { convertToAbsolutePaths } from "./convertToAbsolutePaths";

export interface ProfilerConfig {
  parseImports: RequiredSourcesOptions["parseImports"];
  shouldIncludePath: RequiredSourcesOptions["shouldIncludePath"];
}

export class Profiler {
  config: ProfilerConfig;

  constructor(config: ProfilerConfig) {
    this.config = config;
  }

  async updated(options: any) {
    expect.options(options, [
      "contracts_directory",
      "contracts_build_directory"
    ]);

    const {
      contracts_directory: contractsDirectory,
      contracts_build_directory: contractsBuildDirectory
    } = options;

    const paths: string[] = options.files
      ? options.files
      : await findContracts(contractsDirectory);

    return await updated({ paths, contractsBuildDirectory });
  }

  async requiredSources(options: any) {
    expect.options(options, [
      "paths",
      "base_path",
      "resolver",
      "contracts_directory"
    ]);

    const {
      resolver,
      paths,
      base_path: basePath,
      contracts_directory: contractsDirectory
    } = options;

    debug("paths: %O", paths);

    const resolve = ({ filePath, importedFrom }: UnresolvedSource) =>
      resolver.resolve(filePath, importedFrom);

    const updatedPaths = convertToAbsolutePaths(paths, basePath);
    const allPaths = convertToAbsolutePaths(
      await findContracts(contractsDirectory),
      basePath
    );

    debug("invoking requiredSources");
    return await requiredSources({
      resolve,
      parseImports: this.config.parseImports,
      shouldIncludePath: this.config.shouldIncludePath,
      updatedPaths,
      allPaths
    });
  }
}
