const debug = require("debug")("compile:run");
const OS = require("os");
const semver = require("semver");
const Common = require("@truffle/compile-common");
const { CompilerSupplier } = require("./compilerSupplier");

// this function returns a Compilation - legacy/index.js and ./index.js
// both check to make sure rawSources exist before calling this method
// however, there is a check here that returns null if no sources exist
async function run(rawSources, options, language = "Solidity") {
  if (Object.keys(rawSources).length === 0) {
    return null;
  }

  // Ensure sources have operating system independent paths
  // i.e., convert backslashes to forward slashes; things like C: are left intact.
  // we also strip the project root (to avoid it appearing in metadata)
  // and replace it with "project:/"
  const {
    sources,
    targets,
    originalSourcePaths
  } = Common.Sources.collectSources(
    rawSources,
    options.compilationTargets,
    options.working_directory,
    "project:/"
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
    options
  });
  debug("compilerOutput: %O", compilerOutput);

  // handle warnings as errors if options.strict
  // log if not options.quiet
  const { warnings, errors } = detectErrors({
    compilerOutput,
    options,
    solcVersion
  });
  if (warnings.length > 0) {
    options.events.emit("compile:warnings", { warnings });
  }

  if (errors.length > 0) {
    if (!options.quiet) {
      options.logger.log("");
    }

    throw new Common.Errors.CompileError(errors);
  }

  // success case
  // returns Compilation - see @truffle/compile-common
  const outputSources = processAllSources({
    sources,
    compilerOutput,
    originalSourcePaths,
    language
  });
  const sourceIndexes = outputSources
    ? outputSources.map(source => source.sourcePath)
    : undefined; //leave undefined if sources undefined
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
    .map((functionName, index) => ({ [functionName]: index }))
    .reduce((a, b) => Object.assign({}, a, b), {});

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

/**
 * @param sources - { [sourcePath]: contents }
 * @param targets - sourcePath[]
 * @param setings - subset of Solidity settings
 * @return solc compiler input JSON
 */
function prepareCompilerInput({
  sources,
  targets,
  language,
  settings,
  modelCheckerSettings
}) {
  return {
    language,
    sources: prepareSources({ sources }),
    settings: {
      evmVersion: settings.evmVersion,
      optimizer: settings.optimizer,
      remappings: settings.remappings,
      debug: settings.debug,
      metadata: settings.metadata,
      libraries: settings.libraries,
      viaIR: settings.viaIR,
      modelChecker: settings.modelChecker,
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
function prepareSources({ sources }) {
  return Object.entries(sources)
    .map(([sourcePath, content]) => ({ [sourcePath]: { content } }))
    .reduce((a, b) => Object.assign({}, a, b), {});
}

/**
 * If targets are specified, specify output selectors for each individually.
 * Otherwise, just use "*" selector
 * @param targets - sourcePath[] | undefined
 */
function prepareOutputSelection({ targets = [] }) {
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
async function invokeCompiler({ compilerInput, options }) {
  const supplierOptions = {
    parser: options.parser,
    events: options.events,
    solcConfig: options.compilers.solc
  };
  const supplier = new CompilerSupplier(supplierOptions);
  const { solc } = await supplier.load();
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

/**
 * Extract errors/warnings from compiler output based on strict mode setting
 * @return { errors: string, warnings: string }
 */
function detectErrors({
  compilerOutput: { errors: outputErrors },
  options,
  solcVersion
}) {
  outputErrors = outputErrors || [];
  const rawErrors = options.strict
    ? outputErrors
    : outputErrors.filter(({ severity }) => severity !== "warning");

  const rawWarnings = options.strict
    ? [] // none of those in strict mode
    : outputErrors.filter(({ severity, message }) =>
      severity === "warning" &&
      message !== "Yul is still experimental. Please use the output with care." //filter out Yul warning
    );

  // extract messages
  let errors = rawErrors.map(
    ({ formattedMessage }) => formattedMessage.replace(
      /: File import callback not supported/g, //remove this confusing message suffix
      ""
    )
  ).join();
  const warnings = rawWarnings.map(({ formattedMessage }) => formattedMessage);

  if (errors.includes("requires different compiler version")) {
    const contractSolcVer = errors.match(/pragma solidity[^;]*/gm)[0];
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

  return { warnings, errors };
}

/**
 * aggregate source information based on compiled output;
 * this can include sources that do not define any contracts
 */
function processAllSources({ sources, compilerOutput, originalSourcePaths, language }) {
  if (!compilerOutput.sources) {
    const entries = Object.entries(sources);
    if (entries.length === 1) {
      //special case for handling Yul
      const [sourcePath, contents] = entries[0];
      return [{
        sourcePath: originalSourcePaths[sourcePath],
        contents,
        language
      }]
    } else {
      return [];
    }
  }
  let outputSources = [];
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
}) {
  if (!compilerOutput.contracts) return [];
  return (
    Object.entries(compilerOutput.contracts)
      // map to [[{ source, contractName, contract }]]
      .map(([sourcePath, sourceContracts]) =>
        Object.entries(sourceContracts).map(([contractName, contract]) => ({
          contractName,
          contract,
          source: {
            //some versions of Yul don't have sources in output
            ast: ((compilerOutput.sources || {})[sourcePath] || {}).ast,
            legacyAST: ((compilerOutput.sources || {})[sourcePath] || {}).legacyAST,
            contents: sources[sourcePath],
            sourcePath
          }
        }))
      )
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
        }) => ({
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
            linkReferences: formatLinkReferences((deployedBytecodeInfo || {}).linkReferences)
          }),
          immutableReferences: (deployedBytecodeInfo || {}).immutableReferences,
          //ideally immutable references would be part of the deployedBytecode object,
          //but compatibility makes that impossible
          generatedSources,
          deployedGeneratedSources: (deployedBytecodeInfo || {}).generatedSources,
          compiler: {
            name: "solc",
            version: solcVersion
          }
        })
      )
  );
}

function formatLinkReferences(linkReferences) {
  if (!linkReferences) {
    return [];
  }

  // convert to flat list
  const libraryLinkReferences = Object.values(linkReferences)
    .map(fileLinks =>
      Object.entries(fileLinks).map(([name, links]) => ({
        name,
        links
      }))
    )
    .reduce((a, b) => [...a, ...b], []);

  // convert to { offsets, length, name } format
  return libraryLinkReferences.map(({ name, links }) => ({
    offsets: links.map(({ start }) => start),
    length: links[0].length, // HACK just assume they're going to be the same
    name
  }));
}

// takes linkReferences in output format (not Solidity's format)
function zeroLinkReferences({ bytes, linkReferences }) {
  if (bytes === undefined) {
    return undefined;
  }
  // inline link references - start by flattening the offsets
  const flattenedLinkReferences = linkReferences
    // map each link ref to array of link refs with only one offset
    .map(({ offsets, length, name }) =>
      offsets.map(offset => ({ offset, length, name }))
    )
    // flatten
    .reduce((a, b) => [...a, ...b], []);

  // then overwite bytes with zeroes
  bytes = flattenedLinkReferences.reduce((bytes, { offset, length }) => {
    // length is a byte offset
    const characterLength = length * 2;
    const start = offset * 2;

    const zeroes = "0".repeat(characterLength);

    return `${bytes.substring(0, start)}${zeroes}${bytes.substring(
      start + characterLength
    )}`;
  }, bytes);

  return { bytes, linkReferences };
}

module.exports = { run };
