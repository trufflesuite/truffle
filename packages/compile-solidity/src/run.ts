import { zeroLinkReferences, formatLinkReferences } from "./shims";
import debugModule from "debug";
const debug = debugModule("compile:run");
import OS = require("os");
import semver from "semver";
import { CompilerSupplier } from "./compilerSupplier";
import * as Common from "@truffle/compile-common";
import type {
  Compilation,
  Source,
  CompiledContract
} from "@truffle/compile-common";
import type {
  CompilerOutput,
  Contracts,
  InternalOptions,
  ProcessAllSourcesArgs,
  PrepareCompilerInputArgs,
  PreparedSources,
  PrepareSourcesArgs,
  ProcessContractsArgs,
  Targets
} from "./types";
import type Config from "@truffle/config";

// this function returns a Compilation - legacy/index.js and ./index.js
// both check to make sure rawSources exist before calling this method
// however, there is a check here that returns null if no sources exist
export async function run(
  rawSources: { [name: string]: string },
  options: Config,
  internalOptions: InternalOptions = {}
): Promise<Compilation | null> {
  if (Object.keys(rawSources).length === 0) {
    return null;
  }

  const {
    language = "Solidity", // could also be "Yul"
    noTransform = false, // turns off project root transform
    solc // passing this skips compilerSupplier.load()
  } = internalOptions;

  // Ensure sources have operating system independent paths
  // i.e., convert backslashes to forward slashes; things like C: are left intact.
  // we also strip the project root (to avoid it appearing in metadata)
  // and replace it with "project:/" (unless noTransform is set)
  const { sources, targets, originalSourcePaths } =
    Common.Sources.collectSources(
      rawSources,
      options.compilationTargets,
      noTransform ? "" : options.working_directory,
      noTransform ? "" : "project:/"
    );

  // construct solc compiler input
  const compilerInput = prepareCompilerInput({
    sources,
    targets,
    language,
    settings: options.compilers.solc.settings,
    modelCheckerSettings: options.compilers.solc.modelCheckerSettings
  });

  // perform compilation
  const { compilerOutput, solcVersion } = await invokeCompiler({
    compilerInput,
    solc,
    options
  });
  debug("compilerOutput: %O", compilerOutput);

  // handle warnings as errors if options.strict
  // log if not options.quiet
  const { infos, warnings, errors } = detectErrors({
    compilerOutput,
    options,
    solcVersion
  });
  if (infos.length > 0) {
    options.events.emit("compile:infos", { infos });
  }
  if (warnings.length > 0) {
    options.events.emit("compile:warnings", { warnings });
  }

  if (errors.length > 0) {
    if (!options.quiet) {
      options.logger.log("");
    }

    throw new Common.Errors.CompileError(errors);
  }

  const outputSources: Source[] = processAllSources({
    sources,
    compilerOutput,
    originalSourcePaths,
    language
  });
  const sourceIndexes: string[] = outputSources
    ? outputSources.map(source => source.sourcePath)
    : [];
  return {
    sourceIndexes,
    contracts: processContracts({
      sources,
      compilerOutput,
      solcVersion,
      originalSourcePaths
    }),
    sources: outputSources,
    compiler: {
      name: "solc",
      version: solcVersion
    }
  };
}

function orderABI({ abi, contractName, ast }) {
  if (!abi) {
    return []; //Yul doesn't return ABIs, but we require something
  }

  if (!ast || !ast.nodes) {
    return abi;
  }

  // AST can have multiple contract definitions, make sure we have the
  // one that matches our contract
  const contractDefinition = ast.nodes.find(
    ({ nodeType, name }) =>
      nodeType === "ContractDefinition" && name === contractName
  );

  if (!contractDefinition || !contractDefinition.nodes) {
    return abi;
  }

  // Find all function definitions
  const orderedFunctionNames = contractDefinition.nodes
    .filter(({ nodeType }) => nodeType === "FunctionDefinition")
    .map(({ name: functionName }) => functionName);

  // Put function names in a hash with their order, lowest first, for speed.
  const functionIndexes = orderedFunctionNames
    .map((functionName: string, index: number) => ({ [functionName]: index }))
    .reduce(
      (
        a: { [functionName: string]: number },
        b: { [functionName: string]: number }
      ) => Object.assign({}, a, b),
      {}
    );

  // Construct new ABI with functions at the end in source order
  return [
    ...abi.filter(({ name }) => functionIndexes[name] === undefined),

    // followed by the functions in the source order
    ...abi
      .filter(({ name }) => functionIndexes[name] !== undefined)
      .sort(
        ({ name: a }, { name: b }) => functionIndexes[a] - functionIndexes[b]
      )
  ];
}

function prepareCompilerInput({
  sources,
  targets,
  language,
  settings,
  modelCheckerSettings
}: PrepareCompilerInputArgs) {
  return {
    language,
    sources: prepareSources({ sources }),
    settings: {
      ...settings,
      // Specify compilation targets. Each target uses defaultSelectors,
      // defaulting to single target `*` if targets are unspecified
      outputSelection: prepareOutputSelection({ targets })
    },
    modelCheckerSettings
  };
}

/**
 * Convert sources into solc compiler input format
 * @param sources - { [sourcePath]: string }
 * @return { [sourcePath]: { content: string } }
 */
function prepareSources({ sources }: PrepareSourcesArgs): PreparedSources {
  return Object.entries(sources)
    .map(([sourcePath, content]) => ({ [sourcePath]: { content } }))
    .reduce((a, b) => Object.assign({}, a, b), {});
}

/**
 * If targets are specified, specify output selectors for each individually.
 * Otherwise, just use "*" selector
 * @param targets - sourcePath[] | undefined
 */
function prepareOutputSelection({ targets = [] }: { targets: Targets }) {
  const defaultSelectors = {
    "": ["legacyAST", "ast"],
    "*": [
      "abi",
      "metadata",
      "evm.bytecode.object",
      "evm.bytecode.linkReferences",
      "evm.bytecode.sourceMap",
      "evm.bytecode.generatedSources",
      "evm.deployedBytecode.object",
      "evm.deployedBytecode.linkReferences",
      "evm.deployedBytecode.sourceMap",
      "evm.deployedBytecode.immutableReferences",
      "evm.deployedBytecode.generatedSources",
      "userdoc",
      "devdoc"
    ]
  };

  if (!targets.length) {
    return {
      "*": defaultSelectors
    };
  }

  return targets
    .map(target => ({ [target]: defaultSelectors }))
    .reduce((a, b) => Object.assign({}, a, b), {});
}

/**
 * Load solc and perform compilation
 */
async function invokeCompiler({ compilerInput, options, solc }): Promise<{
  compilerOutput: CompilerOutput;
  solcVersion: string;
}> {
  const supplierOptions = {
    parser: options.parser,
    events: options.events,
    solcConfig: options.compilers.solc
  };

  if (!solc) {
    const supplier = new CompilerSupplier(supplierOptions);
    ({ solc } = await supplier.load());
  }

  const solcVersion = solc.version();

  // perform compilation
  const inputString = JSON.stringify(compilerInput);
  const outputString = solc.compile(inputString);
  const compilerOutput = JSON.parse(outputString);

  return {
    compilerOutput,
    solcVersion
  };
}

function detectErrors({
  compilerOutput,
  options,
  solcVersion
}: {
  compilerOutput: CompilerOutput;
  options: Config;
  solcVersion: string;
}): { errors: string; warnings: string[]; infos: string[] } {
  const outputErrors = compilerOutput.errors || [];
  const rawErrors = outputErrors.filter(
    ({ severity }) =>
      options.strict
        ? severity !== "info" //strict mode: warnings are errors too
        : severity === "error" //nonstrict mode: only errors are errors
  );

  const rawWarnings = options.strict
    ? [] // in strict mode these get classified as errors, not warnings
    : outputErrors.filter(
        ({ severity, message }) =>
          severity === "warning" &&
          message !==
            "Yul is still experimental. Please use the output with care." //filter out Yul warning
      );

  const rawInfos = outputErrors.filter(({ severity }) => severity === "info");

  // extract messages
  let errors = rawErrors
    .map(({ formattedMessage }) =>
      formattedMessage.replace(
        /: File import callback not supported/g, //remove this confusing message suffix
        ""
      )
    )
    .join();
  const warnings = rawWarnings.map(({ formattedMessage }) => formattedMessage);
  const infos = rawInfos.map(({ formattedMessage }) => formattedMessage);

  if (errors.includes("requires different compiler version")) {
    const contractSolcVer = errors.match(/pragma solidity[^;]*/gm)![0];
    const configSolcVer =
      options.compilers.solc.version || semver.valid(solcVersion);

    errors = errors.concat(
      [
        OS.EOL,
        `Error: Truffle is currently using solc ${configSolcVer}, `,
        `but one or more of your contracts specify "${contractSolcVer}".`,
        OS.EOL,
        `Please update your truffle config or pragma statement(s).`,
        OS.EOL,
        `(See https://trufflesuite.com/docs/truffle/reference/configuration#compiler-configuration `,
        `for information on`,
        OS.EOL,
        `configuring Truffle to use a specific solc compiler version.)`
      ].join("")
    );
  }

  return { warnings, errors, infos };
}

/**
 * aggregate source information based on compiled output;
 * this can include sources that do not define any contracts
 */
function processAllSources({
  sources,
  compilerOutput,
  originalSourcePaths,
  language
}: ProcessAllSourcesArgs) {
  if (!compilerOutput.sources) {
    const entries = Object.entries(sources);
    if (entries.length === 1) {
      //special case for handling Yul
      const [sourcePath, contents] = entries[0];
      return [
        {
          sourcePath: originalSourcePaths[sourcePath],
          contents,
          language
        }
      ];
    } else {
      return [];
    }
  }
  let outputSources: Source[] = [];
  for (const [sourcePath, { id, ast, legacyAST }] of Object.entries(
    compilerOutput.sources
  )) {
    outputSources[id] = {
      sourcePath: originalSourcePaths[sourcePath],
      contents: sources[sourcePath],
      ast,
      legacyAST,
      language
    };
  }
  return outputSources;
}

/**
 * Converts compiler-output contracts into @truffle/compile-solidity's return format
 * Uses compiler contract output plus other information.
 */
function processContracts({
  compilerOutput,
  sources,
  originalSourcePaths,
  solcVersion
}: ProcessContractsArgs): CompiledContract[] {
  let { contracts } = compilerOutput;
  if (!contracts) return [];
  //HACK: versions of Solidity prior to 0.4.20 are confused by our "project:/"
  //prefix (or, more generally, by paths containing colons)
  //and put contracts in a weird form as a result.  we detect
  //this case and repair it.
  contracts = repairOldContracts(contracts);
  return (
    Object.entries(contracts)
      // map to [[{ source, contractName, contract }]]
      .map(([sourcePath, sourceContracts]) => {
        return Object.entries(sourceContracts).map(
          ([contractName, contract]) => ({
            contractName,
            contract,
            source: {
              //some versions of Yul don't have sources in output
              ast: ((compilerOutput.sources || {})[sourcePath] || {}).ast,
              legacyAST: ((compilerOutput.sources || {})[sourcePath] || {})
                .legacyAST,
              contents: sources[sourcePath],
              sourcePath
            }
          })
        );
      })
      // and flatten
      .reduce((a, b) => [...a, ...b], [])

      // All source will have a key, but only the compiled source will have
      // the evm output.
      .filter(({ contract: { evm } }) => Object.keys(evm).length > 0)

      // convert to output format
      .map(
        ({
          contractName,
          contract: {
            evm: {
              bytecode: {
                sourceMap,
                linkReferences,
                generatedSources,
                object: bytecode
              },
              deployedBytecode: deployedBytecodeInfo //destructured below
            },
            abi,
            metadata,
            devdoc,
            userdoc
          },
          source: {
            ast,
            legacyAST,
            sourcePath: transformedSourcePath,
            contents: source
          }
        }) => {
          return {
            contractName,
            abi: orderABI({ abi, contractName, ast }),
            metadata,
            devdoc,
            userdoc,
            sourcePath: originalSourcePaths[transformedSourcePath],
            source,
            sourceMap,
            deployedSourceMap: (deployedBytecodeInfo || {}).sourceMap,
            ast,
            legacyAST,
            bytecode: zeroLinkReferences({
              bytes: bytecode,
              linkReferences: formatLinkReferences(linkReferences)
            }),
            deployedBytecode: zeroLinkReferences({
              bytes: (deployedBytecodeInfo || {}).object,
              linkReferences: formatLinkReferences(
                (deployedBytecodeInfo || {}).linkReferences
              )
            }),
            immutableReferences: (deployedBytecodeInfo || {})
              .immutableReferences,
            //ideally immutable references would be part of the deployedBytecode object,
            //but compatibility makes that impossible
            generatedSources,
            deployedGeneratedSources: (deployedBytecodeInfo || {})
              .generatedSources,
            compiler: {
              name: "solc",
              version: solcVersion
            }
          };
        }
      )
  );
}

function repairOldContracts(contracts: Contracts): Contracts {
  const contractNames = Object.values(contracts)
    .map(source => Object.keys(source))
    .flat();
  if (contractNames.some(name => name.includes(":"))) {
    //if any of the "contract names" contains a colon... hack invoked!
    //(notionally we could always apply this hack but let's skip it most of the
    //time please :P )
    let repairedContracts = {};
    for (const [sourcePrefix, sourceContracts] of Object.entries(contracts)) {
      for (const [mixedPath, contract] of Object.entries(sourceContracts)) {
        let sourcePath: string, contractName: string;
        const lastColonIndex = mixedPath.lastIndexOf(":");
        if (lastColonIndex === -1) {
          //if there is none
          sourcePath = sourcePrefix;
          contractName = mixedPath;
        } else {
          contractName = mixedPath.slice(lastColonIndex + 1); //take the part after the final colon
          sourcePath = sourcePrefix + ":" + mixedPath.slice(0, lastColonIndex); //the part before the final colon
        }
        if (!repairedContracts[sourcePath]) {
          repairedContracts[sourcePath] = {};
        }
        repairedContracts[sourcePath][contractName] = contract;
      }
    }
    debug("repaired contracts: %O", repairedContracts);
    return repairedContracts;
  } else {
    //otherwise just return contracts as-is rather than processing
    return contracts;
  }
}
