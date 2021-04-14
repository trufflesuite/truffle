/* eslint-disable @typescript-eslint/no-unused-vars */
import { Compiler, CompilerResult, Profiler } from "@truffle/compile-common";

const findContracts = require("@truffle/contract-sources");

import debugModule from "debug";
const debug = debugModule("compile-ligo");

import { shouldIncludePath } from "./profiler/shouldIncludePath";
import { compileLigo } from "./compiler";
import { compilerAdapter } from "./compilerAdapter";

// TODO BGC All logic but compileLigo can be extracted
const Compile: Compiler = {
  async all(options: any): Promise<CompilerResult> {
    debug('CALL LIGO: all');
    options.logger = options.logger || console;

    const paths = [
      ...new Set([
        ...(await findContracts(options.contracts_directory)),
        ...(options.files || [])
      ])
    ];

    // TODO BGC Map and process
    const compilationResult = await compileFiles(options, paths);

    return {
      compilations: []
    };
  },

  async necessary(options: any): Promise<CompilerResult> {
    debug('CALL LIGO: necessary');
    options.logger = options.logger || console;

    // Profiler for updated files
    const profiler = new Profiler({} as any); // TODO BGC Make them optional
    const paths = await profiler.updated(options);
    if (paths.length === 0) {
      return { compilations: [] };
    }

    const compilationResult = await compileFiles(options, paths);

    return compilationResult;
  },

  async sources({ sources, options }: { sources: object; options: object; }): Promise<CompilerResult> {
    return {
      compilations: []
    };
  },

  async sourcesWithDependencies({ paths, options }: { paths: string[]; options: object; }): Promise<CompilerResult> {
    return {
      compilations: []
    };
  },

  // async display(paths: any, options: any) {
  // }
};

const compileFiles = async (options: any, paths: string[]) => {
  // Profiler for LIGO files
  const fileFilterProfiler = new Profiler({
    shouldIncludePath
  } as any);

  const fileFilterProfilerResult = await fileFilterProfiler.requiredSources(
    options.with({
      paths,
      base_path: options.contracts_directory,
      resolver: options.resolver
    })
  );

  const compileResult = await compileLigo(Object.keys(fileFilterProfilerResult.allSources));

  const result = compilerAdapter(compileResult);

  return result;
};

export { Compile };