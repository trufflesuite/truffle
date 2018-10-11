var CompileError = require("./compileerror");
var fs = require("fs");
var path = require("path");

// Warning issued by a pre-release compiler version, ignored by this component.
var preReleaseCompilerWarning = "This is a pre-release compiler version, please do not use it in production.";

module.exports = {
  // This needs to be fast! It is fast (as of this writing). Keep it fast!
  parseImports: function(body, solc) {
    var self = this;

    // WARNING: Kind of a hack (an expedient one).

    // So we don't have to maintain a separate parser, we'll get all the imports
    // in a file by sending the file to solc and evaluating the error messages
    // to see what import statements couldn't be resolved. To prevent full-on
    // compilation when a file has no import statements, we inject an import
    // statement right on the end; just to ensure it will error and we can parse
    // the imports speedily without doing extra work.

    // If we're using docker/native, we'll still want to use solcjs to do this part.
    if (solc.importsParser) solc = solc.importsParser;

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

    // Filter out the "pre-release compiler" warning, if present.
    var errors = output.errors.filter(function(solidity_error) {
      return solidity_error.message.indexOf(preReleaseCompilerWarning) < 0;
    });

    var nonImportErrors = errors.filter(function(solidity_error) {
      // If the import error key is not found, we must not have an import error.
      // This means we have a *different* parsing error which we should show to the user.
      // Note: solc can return multiple parsing errors at once.
      // We ignore the "pre-release compiler" warning message.
      return solidity_error.formattedMessage.indexOf(importErrorKey) < 0;
    });

    // Should we try to throw more than one? (aside; we didn't before)
    if (nonImportErrors.length > 0) {
      throw new CompileError(nonImportErrors[0].formattedMessage);
    }

    // Now, all errors must be import errors.
    // Filter out our forced import, then get the import paths of the rest.
    var imports = errors.filter(function(solidity_error) {
      return solidity_error.message.indexOf(failingImportFileName) < 0;
    }).map(function(solidity_error) {
      var matches = solidity_error.formattedMessage.match(/import[^'"]+("|')([^'"]+)("|')/);

      // Return the item between the quotes.
      return matches[2];
    });

    return imports;
  }
}
