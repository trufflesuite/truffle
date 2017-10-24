var CompileError = require("./compileerror");
var solc = require("solc");

// Clean up after solc.
var listeners = process.listeners("uncaughtException");
var solc_listener = listeners[listeners.length - 1];

if (solc_listener) {
  process.removeListener("uncaughtException", solc_listener);
}

module.exports = {
  parse: function(body, fileName) {
    // Here, we want a valid AST even if imports don't exist. The way to
    // get around that is to tell the compiler, as they happen, that we
    // have source for them (an empty file).

    var fileName = fileName || "ParsedContract.sol";

    var solcStandardInput = {
      language: "Solidity",
      sources: {
        [fileName]: {
          content: body
        }
      },
      settings: {
        outputSelection: {
          [fileName]: {
            "*": ["ast"]
          }
        }
      }
    };

    var output = solc.compileStandard(JSON.stringify(solcStandardInput), function(file_path) {
      // Tell the compiler we have source code for the dependency
      return {contents: "pragma solidity ^0.4.0;"};
    });

    output = JSON.parse(output);

    if (output.errors) {
      throw new CompileError(output.errors[0].formattedMessage);
    }

    return {
      contracts: Object.keys(output.contracts[fileName]),
      ast: output.sources[fileName].ast
    };
  },

  // This needs to be fast! It is fast (as of this writing). Keep it fast!
  parseImports: function(body) {
    var self = this;

    // WARNING: Kind of a hack (an expedient one).

    // So we don't have to maintain a separate parser, we'll get all the imports
    // in a file by sending the file to solc and evaluating the error messages
    // to see what import statements couldn't be resolved. To prevent full-on
    // compilation when a file has no import statements, we inject an import
    // statement right on the end; just to ensure it will error and we can parse
    // the imports speedily without doing extra work.

    // Helper to detect import errors with an easy regex.
    var importErrorKey = "TRUFFLE_IMPORT";

    // Inject failing import.
    var failingImportFileName = "__Truffle__NotFound.sol";

    body = body + "\n\nimport '" + failingImportFileName + "';\n";

    var solcStandardInput = {
      language: "Solidity",
      sources: {
        "ParsedContract.sol": {
          content: body
        }
      },
      settings: {
        outputSelection: {
          "ParsedContract.sol": {
            "*": [] // We don't need any output.
          }
        }
      }
    };

    var output = solc.compileStandard(JSON.stringify(solcStandardInput), function() {
      // The existence of this function ensures we get a parsable error message.
      // Without this, we'll get an error message we *can* detect, but the key will make it easier.
      // Note: This is not a normal callback. See docs here: https://github.com/ethereum/solc-js#from-version-021
      return {error: importErrorKey};
    });

    output = JSON.parse(output);

    var nonImportErrors = output.errors.filter(function(solidity_error) {
      // If the import error key is not found, we must not have an import error.
      // This means we have a *different* parsing error which we should show to the user.
      // Note: solc can return multiple parsing errors at once.
      return solidity_error.formattedMessage.indexOf(importErrorKey) < 0;
    });

    // Should we try to throw more than one? (aside; we didn't before)
    if (nonImportErrors.length > 0) {
      throw new CompileError(nonImportErrors[0].formattedMessage);
    }

    // Now, all errors must be import errors.
    // Filter out our forced import, then get the import paths of the rest.
    var imports = output.errors.filter(function(solidity_error) {
      return solidity_error.message.indexOf(failingImportFileName) < 0;
    }).map(function(solidity_error) {
      var matches = solidity_error.formattedMessage.match(/import[^'"]+("|')([^'"]+)("|');/);

      // Return the item between the quotes.
      return matches[2];
    });

    return imports;
  }
}
