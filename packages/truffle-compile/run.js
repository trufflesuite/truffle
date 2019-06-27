const OS = require("os");
const CompileError = require("./compileerror");
const CompilerSupplier = require("./compilerSupplier");
const semver = require("semver");

async function run(rawSources, options) {
  // Nothing to compile? Bail.
  if (Object.keys(rawSources).length === 0) {
    return [[], []];
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
  const { warnings, errors } = detectErrors({ compilerOutput, options });
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

  var files = [];
  Object.keys(compilerOutput.sources).forEach(filename => {
    var source = compilerOutput.sources[filename];
    files[source.id] = originalSourcePaths[filename];
  });

  var returnVal = {};

  // This block has comments in it as it's being prepared for solc > 0.4.10
  Object.entries(compilerOutput.contracts).forEach(entry => {
    const [sourcePath, filesContracts] = entry;

    Object.entries(filesContracts).forEach(entry => {
      var [contractName, contract] = entry;

      // All source will have a key, but only the compiled source will have
      // the evm output.
      if (!Object.keys(contract.evm).length) return;

      var contract_definition = {
        contract_name: contractName,
        sourcePath: originalSourcePaths[sourcePath], // Save original source path, not modified ones
        source: sources[sourcePath],
        sourceMap: contract.evm.bytecode.sourceMap,
        deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
        legacyAST: compilerOutput.sources[sourcePath].legacyAST,
        ast: compilerOutput.sources[sourcePath].ast,
        abi: contract.abi,
        metadata: contract.metadata,
        bytecode: "0x" + contract.evm.bytecode.object,
        deployedBytecode: "0x" + contract.evm.deployedBytecode.object,
        unlinked_binary: "0x" + contract.evm.bytecode.object, // deprecated
        compiler: {
          name: "solc",
          version: solcVersion
        },
        devdoc: contract.devdoc,
        userdoc: contract.userdoc
      };

      // Reorder ABI so functions are listed in the order they appear
      // in the source file. Solidity tests need to execute in their expected sequence.
      contract_definition.abi = orderABI(contract_definition);

      // Go through the link references and replace them with older-style
      // identifiers. We'll do this until we're ready to making a breaking
      // change to this code.
      Object.keys(contract.evm.bytecode.linkReferences).forEach(function(
        file_name
      ) {
        var fileLinks = contract.evm.bytecode.linkReferences[file_name];

        Object.keys(fileLinks).forEach(function(library_name) {
          var linkReferences = fileLinks[library_name] || [];

          contract_definition.bytecode = replaceLinkReferences(
            contract_definition.bytecode,
            linkReferences,
            library_name
          );
          contract_definition.unlinked_binary = replaceLinkReferences(
            contract_definition.unlinked_binary,
            linkReferences,
            library_name
          );
        });
      });

      // Now for the deployed bytecode
      Object.keys(contract.evm.deployedBytecode.linkReferences).forEach(
        function(file_name) {
          var fileLinks =
            contract.evm.deployedBytecode.linkReferences[file_name];

          Object.keys(fileLinks).forEach(function(library_name) {
            var linkReferences = fileLinks[library_name] || [];

            contract_definition.deployedBytecode = replaceLinkReferences(
              contract_definition.deployedBytecode,
              linkReferences,
              library_name
            );
          });
        }
      );

      returnVal[contractName] = contract_definition;
    });
  });

  const compilerInfo = { name: "solc", version: solcVersion };

  return [returnVal, files, compilerInfo];
}

function replaceLinkReferences(bytecode, linkReferences, libraryName) {
  var linkId = "__" + libraryName;

  while (linkId.length < 40) {
    linkId += "_";
  }

  linkReferences.forEach(function(ref) {
    // ref.start is a byte offset. Convert it to character offset.
    var start = ref.start * 2 + 2;

    bytecode =
      bytecode.substring(0, start) + linkId + bytecode.substring(start + 40);
  });

  return bytecode;
}

function orderABI({ abi, contract_name: contractName, ast }) {
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
  const solc = await supplier.load();
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
function detectErrors({ compilerOutput: { errors: outputErrors }, options }) {
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
      options.compilers.solc.version || semver.valid(solc.version());

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

module.exports = { run };
