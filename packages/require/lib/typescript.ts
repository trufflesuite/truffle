import path from "path";

import type TSNode from "ts-node";
import TruffleConfig from "@truffle/config";
import { readFileSync } from "fs";

import originalRequire from "original-require";

import { TsNodeDependencyError } from "./types";

import Debug from "debug";

const debug = Debug("require:typescript");

const _tsExtensionExpr = /^\.(cts|tsx?)$/i;

let tsNode: typeof TSNode | null = null;

/**
 * @param conf the instance of `@truffle/config` for the user's project
 *
 * @param sourceFilePath the path to the source module to be compiled
 *
 * @param context the global context in which the compiled script will run
 *
 * @returns the TypeScript code stored in the file at location `sourceFilePath`
 *   transpiled to JavaScript when `scriptPath` has a TypeScript file extension,
 *   otherwise it returns the contents of the `scriptPath` file.
 */
export function compile(conf: TruffleConfig, sourceFilePath: string): string {
  const source = readFileSync(sourceFilePath, { encoding: "utf-8" });

  // we only compile TS files, so just return the source unless we are dealing
  // with one of those
  if (!_tsExtensionExpr.test(path.extname(sourceFilePath))) {
    debug(`${sourceFilePath} is not a TS file, returning unmodified source`);
    return source;
  }

  const compilationService = _getOrCreateCompilationService(
    conf,
    sourceFilePath
  );

  debug(`compiling ${sourceFilePath}`);
  return compilationService.compile(source, sourceFilePath);
}

/**
 * Creates and caches an instance of TypeScript compiler service that has been
 * initialized with the global context for the module that we'll be executing.
 *
 * @param conf the instance of `@truffle/config` for the user's project
 *
 * @param sourceFilePath the path to the source module being compiled
 *
 * @param context the global context in which the compiled script will run
 *
 * @returns an instance of a TypeScript compiler service (TS Compiler API)
 */
function _getOrCreateCompilationService(
  conf: TruffleConfig,
  sourceFilePath: string
): TSNode.Service {
  if (tsNode === null) {
    try {
      // We use `originalRequire` here to ensure that we use ts-node from the
      // user's environment rather than resolving our own (should we
      // accidentally bundle ts-node)
      tsNode = originalRequire("ts-node") as typeof TSNode;
    } catch (err) {
      throw new TsNodeDependencyError(sourceFilePath, { cause: err });
    }
  }

  // we get away with this here because the instance of `process` that we pass
  // into the child context is from our parent global context
  if (!process.hasOwnProperty(tsNode.REGISTER_INSTANCE)) {
    debug("registering ts-node compiler service");
    const createOptions: TSNode.CreateOptions = {
      cwd: conf.working_directory,
      esm: false,
      compilerOptions: {
        inlineSourceMap: true
      }
    };

    let compilationService = tsNode.create(createOptions);

    _compileSandboxGlobalContextTypes(compilationService!);

    tsNode.register(compilationService);
  } else {
    debug("ts-node compiler service already registered");
  }

  return process[tsNode.REGISTER_INSTANCE]!;
}

/**
 * Initializes the compiler service with the global types for the sandbox
 * environment.
 */
function _compileSandboxGlobalContextTypes(compilationService: TSNode.Service) {
  /*
   * It may seem a bit weird that we're compiling a typescript file here to
   * register the global types w/ the compiler service, but this is
   * unfortunately the best option available to us.
   *
   * To use a precompiled `.d.ts` file we'd need to either inject a triple slash
   * directive, import, or require into the user's source, or modify one or more
   * TypeScript compilerOptions in the config. Each of these alternatives come
   * with some unfavorable trade-off.
   *
   * Injecting code has the potential to cause line number offset issues for
   * stack traces, and it causes the compiler service to reevaluate the global
   * types for each new file we process.
   *
   * Modifying compilerOptions (either `files` or `typeRoots` params) overrides
   * default behavior (e.g. the `@types` search path) and/or the user's own
   * config from `tsconfig.json`.
   *
   * With the method used here, we take a small performance hit when the
   * compiler service is first initialized, but otherwise all user code is
   * processed without modification, and compiler configuration is kept
   * consistent with whatever the user set up in their `tsconfig.json`, if it
   * exists.
   */
  const sandboxGlobalContextTypesPath = path.join(
    __dirname,
    "sandboxGlobalContextTypes.ts"
  );
  compilationService!.compile(
    readFileSync(sandboxGlobalContextTypesPath, { encoding: "utf-8" }),
    sandboxGlobalContextTypesPath
  );
}
