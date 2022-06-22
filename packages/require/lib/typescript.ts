import path from "path";

import type { CreateOptions, Service } from "ts-node";
import TruffleConfig from "@truffle/config";
import { readFileSync } from "fs";

import originalRequire from "original-require";

import { Script } from "vm";
import { TsNodeDependencyError } from "./types";

const _tsExtensionExpr = /^\.(cts|tsx?)$/i;

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
export function compile(
  conf: TruffleConfig,
  sourceFilePath: string,
  context: Object
): string {
  const source = readFileSync(sourceFilePath, { encoding: "utf-8" });

  // we only compile TS files, so just return the source unless we are dealing
  // with one of those
  if (!_tsExtensionExpr.test(path.extname(sourceFilePath))) {
    return source;
  }

  const compilationService = _getOrCreateCompilationService(
    conf,
    sourceFilePath,
    context
  );

  return compilationService.compile(source, sourceFilePath);
}

/**
 * IMPORTANT: Do not reference this directly. Instead use the
 *   `_getOrCreateCompilationService` function to retrieve it.
 */
let _compilationService: Service | null = null;

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
  sourceFilePath: string,
  context: Object
): Service {
  if (_compilationService === null) {
    const createOptions: CreateOptions = {
      cwd: path.dirname(sourceFilePath),
      esm: false,
      compilerOptions: {
        inlineSourceMap: true
      }
    };

    try {
      // Ensure that ts-node is installed by attempting to resolve its module ID.
      // We use `originalRequire` here to ensure that we use ts-node from the
      // user's environment rather than resolving our own (should we
      // accidentally bundle ts-node)
      originalRequire.resolve("ts-node");
    } catch (err) {
      // TODO: add error chaining support
      throw new TsNodeDependencyError(path.extname(sourceFilePath));
    }

    _compilationService = originalRequire("ts-node").create(createOptions);

    _compileSandboxGlobalContextTypes(_compilationService!);

    _registerTsNode(conf, sourceFilePath, context);
  }

  return _compilationService!;
}

/**
 * Registers the ts-node compiler into a script's global context
 *
 * @param conf the instance of `@truffle/config` for the user's project
 *
 * @param sourceFilePath the path to the module being compiled/executed by
 *   `@truffle/require`
 *
 * @param context the global context into which ts-node will be registered
 */
export function _registerTsNode(
  conf: TruffleConfig,
  sourceFilePath: string,
  context: Object
) {
  // we only compile TS files, so bail unless we are dealing with one of those;
  if (!_tsExtensionExpr.test(path.extname(sourceFilePath))) {
    return;
  }

  const code = `
    const tsNode = require("ts-node");
    const registrationOptions = {
      cwd: ${JSON.stringify(conf.working_directory.toString())},
      compilerOptions: {
        inlineSourceMap: true
      }
    };
    tsNode.register(registrationOptions);
    `;
  const script = new Script(code);
  script.runInContext(context);
}

/**
 * Initializes the compiler service with the global types for the sandbox
 * environment.
 */
function _compileSandboxGlobalContextTypes(compilationService: Service) {
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
