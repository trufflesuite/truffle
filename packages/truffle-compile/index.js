var OS = require("os");

var path = require("path");
var fs = require("fs");
var async = require("async");
var Profiler = require("./profiler");
var CompileError = require("./compileerror");
var CompilerSupplier = require("./compilerSupplier");
var expect = require("truffle-expect");
var find_contracts = require("truffle-contract-sources");
var Config = require("truffle-config");
var debug = require("debug")("compile");

// Most basic of the compile commands. Takes a hash of sources, where
// the keys are file or module paths and the values are the bodies of
// the contracts. Does not evaulate dependencies that aren't already given.
//
// Default options:
// {
//   strict: false,
//   quiet: false,
//   logger: console
// }
var compile = function(sources, options, callback) {
  if (typeof options == "function") {
    callback = options;
    options = {};
  }

  if (options.logger == null) {
    options.logger = console;
  }

  var hasTargets = options.compilationTargets && options.compilationTargets.length;

  expect.options(options, [
    "contracts_directory",
    "compilers"
  ]);

  expect.options(options.compilers, ["solc"]);
  expect.options(options.compilers.solc, ["settings"]);

  // Grandfather in old solc config
  if (options.solc){
    options.compilers.solc.settings.evmVersion = options.solc.evmVersion;
    options.compilers.solc.settings.optimizer = options.solc.optimizer;
  }

  // Ensure sources have operating system independent paths
  // i.e., convert backslashes to forward slashes; things like C: are left intact.
  var operatingSystemIndependentSources = {};
  var operatingSystemIndependentTargets = {};
  var originalPathMappings = {};

  Object.keys(sources).forEach(function(source) {
    // Turn all backslashes into forward slashes
    var replacement = source.replace(/\\/g, "/");

    // Turn G:/.../ into /G/.../ for Windows
    if (replacement.length >= 2 && replacement[1] == ":") {
      replacement = "/" + replacement;
      replacement = replacement.replace(":", "");
    }

    // Save the result
    operatingSystemIndependentSources[replacement] = sources[source];

    // Just substitute replacement for original in target case. It's
    // a disposable subset of `sources`
    if(hasTargets && options.compilationTargets.includes(source)){
      operatingSystemIndependentTargets[replacement] = sources[source];
    }

    // Map the replacement back to the original source path.
    originalPathMappings[replacement] = source;
  });

  var defaultSelectors = {
   "": [
      "legacyAST",
      "ast"
    ],
    "*": [
      "abi",
      "evm.bytecode.object",
      "evm.bytecode.sourceMap",
      "evm.deployedBytecode.object",
      "evm.deployedBytecode.sourceMap",
      "userdoc",
      "devdoc"
    ]
  }

  // Specify compilation targets
  // Each target uses defaultSelectors, defaulting to single target `*` if targets are unspecified
  var outputSelection = {};
  var targets = operatingSystemIndependentTargets;
  var targetPaths = Object.keys(targets);

  (targetPaths.length)
    ? targetPaths.forEach(key => outputSelection[key] = defaultSelectors)
    : outputSelection["*"] = defaultSelectors;

  var solcStandardInput = {
    language: "Solidity",
    sources: {},
    settings: {
      evmVersion: options.compilers.solc.settings.evmVersion,
      optimizer: options.compilers.solc.settings.optimizer,
      outputSelection
    }
  };

  // Nothing to compile? Bail.
  if (Object.keys(sources).length == 0) {
    return callback(null, [], []);
  }

  Object.keys(operatingSystemIndependentSources).forEach(function(file_path) {
    solcStandardInput.sources[file_path] = {
      content: operatingSystemIndependentSources[file_path]
    }
  });

  // Load solc module only when compilation is actually required.
  var supplier = new CompilerSupplier(options.compilers.solc);

  supplier.load().then(solc => {
    var result = solc.compileStandard(JSON.stringify(solcStandardInput));

    var standardOutput = JSON.parse(result);

    var errors = standardOutput.errors || [];
    var warnings = [];

    if (options.strict !== true) {
      warnings = errors.filter(function(error) {
        return error.severity == "warning";
      });

      errors = errors.filter(function(error) {
        return error.severity != "warning";
      });

      if (options.quiet !== true && warnings.length > 0) {
        options.logger.log(OS.EOL + "Compilation warnings encountered:" + OS.EOL);
        options.logger.log(warnings.map(function(warning) {
          return warning.formattedMessage;
        }).join());
      }
    }

    if (errors.length > 0) {
      options.logger.log("");
      return callback(new CompileError(standardOutput.errors.map(function(error) {
        return error.formattedMessage;
      }).join()));
    }

    var contracts = standardOutput.contracts;

    var files = [];
    Object.keys(standardOutput.sources).forEach(function(filename) {
      var source = standardOutput.sources[filename];
      files[source.id] = filename;
    });

    var returnVal = {};

    // This block has comments in it as it's being prepared for solc > 0.4.10
    Object.keys(contracts).forEach(function(source_path) {
      var files_contracts = contracts[source_path];

      Object.keys(files_contracts).forEach(function(contract_name) {
        var contract = files_contracts[contract_name];

        // All source will have a key, but only the compiled source will have
        // the evm output.
        if (!Object.keys(contract.evm).length) return;

        var contract_definition = {
          contract_name: contract_name,
          sourcePath: originalPathMappings[source_path], // Save original source path, not modified ones
          source: operatingSystemIndependentSources[source_path],
          sourceMap: contract.evm.bytecode.sourceMap,
          deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
          legacyAST: standardOutput.sources[source_path].legacyAST,
          ast: standardOutput.sources[source_path].ast,
          abi: contract.abi,
          bytecode: "0x" + contract.evm.bytecode.object,
          deployedBytecode: "0x" + contract.evm.deployedBytecode.object,
          unlinked_binary: "0x" + contract.evm.bytecode.object, // deprecated
          compiler: {
            "name": "solc",
            "version": solc.version()
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
        Object.keys(contract.evm.bytecode.linkReferences).forEach(function(file_name) {
          var fileLinks = contract.evm.bytecode.linkReferences[file_name];

          Object.keys(fileLinks).forEach(function(library_name) {
            var linkReferences = fileLinks[library_name] || [];

            contract_definition.bytecode = replaceLinkReferences(contract_definition.bytecode, linkReferences, library_name);
            contract_definition.unlinked_binary = replaceLinkReferences(contract_definition.unlinked_binary, linkReferences, library_name);
          });
        });

        // Now for the deployed bytecode
        Object.keys(contract.evm.deployedBytecode.linkReferences).forEach(function(file_name) {
          var fileLinks = contract.evm.deployedBytecode.linkReferences[file_name];

          Object.keys(fileLinks).forEach(function(library_name) {
            var linkReferences = fileLinks[library_name] || [];

            contract_definition.deployedBytecode = replaceLinkReferences(contract_definition.deployedBytecode, linkReferences, library_name);
          });
        });

        returnVal[contract_name] = contract_definition;
      });
    });

    callback(null, returnVal, files);
  })
  .catch(callback);
};

function replaceLinkReferences(bytecode, linkReferences, libraryName) {
  var linkId = "__" + libraryName;

  while (linkId.length < 40) {
    linkId += "_";
  }

  linkReferences.forEach(function(ref) {
    // ref.start is a byte offset. Convert it to character offset.
    var start = (ref.start * 2) + 2;

    bytecode = bytecode.substring(0, start) + linkId + bytecode.substring(start + 40);
  });

  return bytecode;
};

function orderABI(contract){
  var contract_definition;
  var ordered_function_names = [];
  var ordered_functions = [];

  for (var i = 0; i < contract.legacyAST.children.length; i++) {
    var definition = contract.legacyAST.children[i];

    // AST can have multiple contract definitions, make sure we have the
    // one that matches our contract
    if (definition.name !== "ContractDefinition" ||
        definition.attributes.name !== contract.contract_name){
      continue;
    }

    contract_definition = definition;
    break;
  }

  if (!contract_definition) return contract.abi;
  if (!contract_definition.children) return contract.abi;

  contract_definition.children.forEach(function(child) {
    if (child.name == "FunctionDefinition") {
      ordered_function_names.push(child.attributes.name);
    }
  });

  // Put function names in a hash with their order, lowest first, for speed.
  var functions_to_remove = ordered_function_names.reduce(function(obj, value, index) {
    obj[value] = index;
    return obj;
  }, {});

  // Filter out functions from the abi
  var function_definitions = contract.abi.filter(function(item) {
    return functions_to_remove[item.name] != null;
  });

  // Sort removed function defintions
  function_definitions = function_definitions.sort(function(item_a, item_b) {
    var a = functions_to_remove[item_a.name];
    var b = functions_to_remove[item_b.name];

    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  });

  // Create a new ABI, placing ordered functions at the end.
  var newABI = [];
  contract.abi.forEach(function(item) {
    if (functions_to_remove[item.name] != null) return;
    newABI.push(item);
  });

  // Now pop the ordered functions definitions on to the end of the abi..
  Array.prototype.push.apply(newABI, function_definitions);

  return newABI;
}


// contracts_directory: String. Directory where .sol files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.all = function(options, callback) {

  find_contracts(options.contracts_directory, function(err, files) {
    if (err) return callback(err)

    options.paths = files;
    compile.with_dependencies(options, callback);
  });
};

// contracts_directory: String. Directory where .sol files can be found.
// build_directory: String. Optional. Directory where .sol.js files can be found. Only required if `all` is false.
// all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
//      in the build directory to see what needs to be compiled.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.necessary = function(options, callback) {
  var self = this;
  options.logger = options.logger || console;

  Profiler.updated(options, function(err, updated) {
    if (err) return callback(err);

    if (updated.length == 0 && options.quiet != true) {
      return callback(null, [], {});
    }

    options.paths = updated;
    compile.with_dependencies(options, callback);
  });
};

compile.with_dependencies = function(options, callback) {
  var self = this;

  options.logger = options.logger || console;
  options.contracts_directory = options.contracts_directory || process.cwd();

  expect.options(options, [
    "paths",
    "working_directory",
    "contracts_directory",
    "resolver"
  ]);

  var config = Config.default().merge(options);

  Profiler.required_sources(config.with({
    paths: options.paths,
    base_path: options.contracts_directory,
    resolver: options.resolver
  }), (err, allSources, required) => {
    if (err) return callback(err);

    var hasTargets = required.length;

    (hasTargets)
      ? self.display(required, options)
      : self.display(allSources, options);

    options.compilationTargets = required;
    compile(allSources, options, callback);
  });
};

compile.display = function(paths, options){
  if (options.quiet != true) {
    if (!Array.isArray(paths)){
      paths = Object.keys(paths);
    }

    paths.sort().forEach(contract => {
      if (path.isAbsolute(contract)) {
        contract = "." + path.sep + path.relative(options.working_directory, contract);
      }
      options.logger.log("Compiling " + contract + "...");
    });
  }
};

compile.CompilerSupplier = CompilerSupplier;
module.exports = compile;
