import debugModule from "debug";
const debug = debugModule("profiler");

const findContracts = require("@truffle/contract-sources");
const expect = require("@truffle/expect");

import type TruffleConfig from "@truffle/config";
import { updated } from "./updated";
import type { UnresolvedSource } from "./resolveAllSources";
import { requiredSources, RequiredSourcesOptions } from "./requiredSources";
import { convertToAbsolutePaths } from "./convertToAbsolutePaths";

export interface ProfilerConfig {
  parseImports?: RequiredSourcesOptions["parseImports"];
  shouldIncludePath?: RequiredSourcesOptions["shouldIncludePath"];
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
      contracts_directory: contractsDirectory,
      compiler // { name, version }
    } = options;

    debug("paths: %O", paths);

    const resolve = async ({ filePath, importedFrom }: UnresolvedSource) => {
      //we want to allow resolution failure here.  so, if a source can't
      //be resolved, it will show up as a compile error rather than a Truffle
      //error.
      try {
        return await resolver.resolve(filePath, importedFrom, { compiler });
      } catch (error) {
        //resolver doesn't throw structured errors at the moment,
        //so we'll check the messag to see whether this is an expected error
        //(kind of a HACK)
        if(error.message.startsWith("Could not find ")) {
          return undefined;
        } else {
          //rethrow unexpected errors
          throw error;
        }
      }
    };

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

  async requiredSourcesForSingleFile(options: TruffleConfig) {
    expect.options(options, ["path", "base_path", "resolver"]);

    const {
      resolver,
      path,
      base_path: basePath,
      compiler // { name, version }
    } = options;

    const resolve = ({ filePath, importedFrom }: UnresolvedSource) =>
      resolver.resolve(filePath, importedFrom, { compiler });

    const allPaths = convertToAbsolutePaths([path], basePath);
    const updatedPaths = allPaths;

    return await requiredSources({
      resolve,
      parseImports: this.config.parseImports,
      shouldIncludePath: this.config.shouldIncludePath,
      updatedPaths,
      allPaths
    });
  }
}
