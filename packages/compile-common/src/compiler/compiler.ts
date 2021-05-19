import * as path from "path";

const findContracts = require("@truffle/contract-sources");

import { Profiler } from "../profiler";
import { Compiler, CompilerResult } from "../types";

export class BaseCompiler implements Compiler {
  // TODO BGC Replace any with generic types
  constructor(
    private readonly fileExtensions: string[],
    private readonly compile: (paths: string[]) => Promise<any>,
    private readonly compileAdapter: (compileResult: any) => CompilerResult
    ) {}

  async all(options: any): Promise<CompilerResult> {
    const paths = [
      ...new Set([
        ...(await findContracts(options.contracts_directory)),
        ...(options.files || [])
      ])
    ];

    return this.sourcesWithDependencies({ paths, options });
  }

  async necessary(options: object): Promise<CompilerResult> {
    // Profiler to gather updated files
    const profiler = new Profiler({});
    const paths = await profiler.updated(options);
    if (paths.length === 0) {
      return { compilations: [] };
    }

    return this.sourcesWithDependencies({ paths, options });
  }

  async sources({ sources, options }: { sources: object; options: any; }): Promise<CompilerResult> {
    const paths = Object.keys(sources);
    return this.compileFiles(options, paths);
  }

  sourcesWithDependencies({ paths, options }: { paths: string[]; options: object; }): Promise<CompilerResult> {
    return this.compileFiles(options, paths);
  }

  private async compileFiles(options: any, paths: string[]): Promise<CompilerResult> {
    const shouldIncludePath = (filePath: string) => {
      return this.fileExtensions.map(fileExtension => `.${fileExtension}`).includes(path.extname(filePath));
    };

    const fileFilterProfiler = new Profiler({
      shouldIncludePath
    });
  
    const fileFilterProfilerResult = await fileFilterProfiler.requiredSources(
      options.with({
        paths,
        base_path: options.contracts_directory,
        resolver: options.resolver
      })
    );
  
    const compileResult = await this.compile(Object.keys(fileFilterProfilerResult.allSources));
  
    return this.compileAdapter(compileResult);
  }
}
