import * as path from "path";
import Config from "@truffle/config";

import { Profiler } from "../profiler";
import { Compiler, CompilerResult, ICompileStrategy } from "../types";

export const profilerBuilder = (fileExtensions: string[]): Profiler => {
  const shouldIncludePath = (filePath: string) => {
    return fileExtensions.map(fileExtension => `.${fileExtension}`).includes(path.extname(filePath));
  };

  return new Profiler({ shouldIncludePath });
};

export class TezosCompiler implements Compiler {
  constructor(
    private readonly compileStrategy: ICompileStrategy,
    private readonly profiler: Profiler,
    private readonly findContracts: (pattern: string) => Promise<string[]>
    ) {}

  async all(options: Config): Promise<CompilerResult> {
    const paths = [
      ...new Set([
        ...(await this.findContracts(options.contracts_directory)),
        ...(options.files || [])
      ])
    ];

    return this.sourcesWithDependencies({ paths, options });
  }

  async necessary(options: Config): Promise<CompilerResult> {
    const paths = await this.profiler.updated(options);
    if (paths.length === 0) {
      return { compilations: [] };
    }

    return this.sourcesWithDependencies({ paths, options });
  }

  sources({ sources, options }: { sources: object; options: Config; }): Promise<CompilerResult> {
    const paths = Object.keys(sources);
    return this.compileFiles(options, paths);
  }

  sourcesWithDependencies({ paths, options }: { paths: string[]; options: Config; }): Promise<CompilerResult> {
    return this.compileFiles(options, paths);
  }

  private async compileFiles(options: Config, paths: string[]): Promise<CompilerResult> {
    options = Config.default().merge(options);

    const fileFilterProfilerResult = await this.profiler.requiredSources(
      options.with({
        paths,
        base_path: options.contracts_directory,
        resolver: options.resolver
      })
    );

    this.display(options, fileFilterProfilerResult.compilationTargets);

    return this.compileStrategy.compile(Object.keys(fileFilterProfilerResult.allSources), options?.compilers[this.compileStrategy.compiler]?.settings);
  }

  private display(options: Config, paths: string[]) {
    if (options.quiet !== true && options.events) {
      if (!Array.isArray(paths)) {
        paths = Object.keys(paths);
      }

      const sourceFileNames = paths
        .sort()
        .map(contract => {
          if (path.isAbsolute(contract)) {
            return `.${path.sep}${path.relative(
              options.working_directory,
              contract
            )}`;
          }

          return contract;
        })
        .filter(contract => contract);

      options.events.emit("compile:sourcesToCompile", { sourceFileNames });
    }
  }
}
