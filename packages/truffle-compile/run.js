const debug = require("debug")("compile:run"); // eslint-disable-line no-unused-vars
const OS = require("os");
const semver = require("semver");

const CompileError = require("./compileerror");
const CompilerSupplier = require("./compilerSupplier");

async function run(rawSources, options) {
  if (Object.keys(rawSources).length === 0) {
    return {
      contracts: [],
      sourceIndexes: [],
      compilerInfo: undefined
    };
  }

  // Ensure sources have operating system independent paths
  // i.e., convert backslashes to forward slashes; things like C: are left intact.
  const { sources, targets, originalSourcePaths } = collectSources(
    rawSources,
    options.compilationTargets
  );

  // construct solc compiler input
  const compilerInput = prepareCompilerInput({
    sources,
    targets,
    settings: options.compilers.solc.settings
  });

  // perform compilation
  const { compilerOutput, solcVersion } = await invokeCompiler({
    compilerInput,
    options
  });

  // handle warnings as errors if options.strict
  // log if not options.quiet
  const { warnings, errors } = detectErrors({
    compilerOutput,
    options,
    solcVersion
  });
  if (warnings.length > 0 && !options.quiet) {
    options.logger.log(
      OS.EOL + "    > compilation warnings encountered:" + OS.EOL
    );
    options.logger.log(warnings);
  }

  if (errors.length > 0) {
    if (!options.quiet) {
      options.logger.log("");
    }

    throw new CompileError(errors);
  }

  // success case
  return {
    sourceIndexes: processSources({
      compilerOutput,
      originalSourcePaths
    }),
    contracts: processContracts({
      sources,
      compilerOutput,
      solcVersion,
      originalSourcePaths
    }),
    compilerInfo: {
      name: "solc",
      version: solcVersion
    }
  };
}

function orderABI({ abi, contractName, ast }) {
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
 * Collects sources, targets into collections with OS-independent paths,
 * along with a reverse mapping to the original path (for post-processing)
 *
 * @param originalSources - { [originalSourcePath]: contents }
 * @param originalTargets - originalSourcePath[]
 * @return { sources, targets, originalSourcePaths }
 */
function collectSources(originalSources, originalTargets = []) {
  const mappedResults = Object.entries(originalSources)
    .map(([originalSourcePath, contents]) => ({
      originalSourcePath,
      contents,
      sourcePath: getPortableSourcePath(originalSourcePath)
    }))
    .map(({ originalSourcePath, sourcePath, contents }) => ({
      sources: {
        [sourcePath]: contents
      },

      // include transformed form as target if original is a target
      targets: originalTargets.includes(originalSourcePath) ? [sourcePath] : [],

      originalSourcePaths: {
        [sourcePath]: originalSourcePath
      }
    }));

  const defaultAccumulator = {
    sources: {},
    targets: [],
    originalSourcePaths: {}
  };

  return mappedResults.reduce(
    (accumulator, result) => ({
      sources: Object.assign({}, accumulator.sources, result.sources),
      targets: [...accumulator.targets, ...result.targets],
      originalSourcePaths: Object.assign(
        {},
        accumulator.originalSourcePaths,
        result.originalSourcePaths
      )
    }),
    defaultAccumulator
  );
}

/**
 * @param sourcePath - string
 * @return string - operating system independent path
 * @private
 */
function getPortableSourcePath(sourcePath) {
  // Turn all backslashes into forward slashes
  var replacement = sourcePath.replace(/\\/g, "/");

  // Turn G:/.../ into /G/.../ for Windows
  if (replacement.length >= 2 && replacement[1] === ":") {
    replacement = "/" + replacement;
    replacement = replacement.replace(":", "");
  }

  return replacement;
}

/**
 * @param sources - { [sourcePath]: contents }
 * @param targets - sourcePath[]
 * @param setings - subset of Solidity settings
 * @return solc compiler input JSON
 */
function prepareCompilerInput({ sources, targets, settings }) {
  return {
    language: "Solidity",
    sources: prepareSources({ sources }),
    settings: {
      evmVersion: settings.evmVersion,
      optimizer: settings.optimizer,

      // Specify compilation targets. Each target uses defaultSelectors,
      // defaulting to single target `*` if targets are unspecified
      outputSelection: prepareOutputSelection({ targets })
    }
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
      "evm.bytecode.sourceMap",
      "evm.deployedBytecode.object",
      "evm.deployedBytecode.sourceMap",
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
  // load solc
  const supplier = new CompilerSupplier(options.compilers.solc);
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
    : outputErrors.filter(({ severity }) => severity === "warning");

  // extract messages
  let errors = rawErrors.map(({ formattedMessage }) => formattedMessage).join();
  const warnings = rawWarnings
    .map(({ formattedMessage }) => formattedMessage)
    .join();

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
        `(See https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration `,
        `for information on`,
        OS.EOL,
        `configuring Truffle to use a specific solc compiler version.)`
      ].join("")
    );
  }

  return { warnings, errors };
}

/**
 * Aggregate list of sources based on reported source index
 * Returns list transformed to use original source paths
 */
function processSources({ compilerOutput, originalSourcePaths }) {
  let files = [];

  for (let [sourcePath, { id }] of Object.entries(compilerOutput.sources)) {
    files[id] = originalSourcePaths[sourcePath];
  }

  return files;
}

/**
 * Converts compiler-output contracts into truffle-compile's return format
 * Uses compiler contract output plus other information.
 */
function processContracts({
  compilerOutput,
  sources,
  originalSourcePaths,
  solcVersion
}) {
  return (
    Object.entries(compilerOutput.contracts)
      // map to [[{ source, contractName, contract }]]
      .map(([sourcePath, sourceContracts]) =>
        Object.entries(sourceContracts).map(([contractName, contract]) => ({
          contractName,
          contract,
          source: {
            ast: compilerOutput.sources[sourcePath].ast,
            legacyAST: compilerOutput.sources[sourcePath].legacyAST,
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
              bytecode: { sourceMap, linkReferences, object: bytecode },
              deployedBytecode: {
                sourceMap: deployedSourceMap,
                linkReferences: deployedLinkReferences,
                object: deployedBytecode
              }
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
          deployedSourceMap,
          ast,
          legacyAST,
          bytecode: zeroLinkReferences({
            bytes: bytecode,
            linkReferences: formatLinkReferences(linkReferences)
          }),
          deployedBytecode: zeroLinkReferences({
            bytes: deployedBytecode,
            linkReferences: formatLinkReferences(deployedLinkReferences)
          }),
          compiler: {
            name: "solc",
            version: solcVersion
          }
        })
      )
  );
}

function formatLinkReferences(linkReferences) {
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
