const debug = require("debug")("compile:parser"); // eslint-disable-line no-unused-vars
const CompileError = require("./compileerror");

// Warning issued by a pre-release compiler version, ignored by this component.
const preReleaseCompilerWarning =
  "This is a pre-release compiler version, please do not use it in production.";

module.exports = {
  // This needs to be fast! It is fast (as of this writing). Keep it fast!
  parseImports(body, solc) {
    // WARNING: Kind of a hack (an expedient one).

    // So we don't have to maintain a separate parser, we'll get all the imports
    // in a file by sending the file to solc and evaluating the error messages
    // to see what import statements couldn't be resolved. To prevent full-on
    // compilation when a file has no import statements, we inject an import
    // statement right on the end; just to ensure it will error and we can parse
    // the imports speedily without doing extra work.

    // If we're using docker/native, we'll use the provided importsParser object of methods.
    if (solc.importsParser) solc = solc.importsParser;

    // Helper to detect import errors with an easy regex.
    const importErrorKey = "not found: File";

    // Inject failing import.
    const failingImportFileName = "__Truffle__NotFound.sol";

    body = `${body}\n\nimport '${failingImportFileName}';\n`;

    const solcStandardInput = {
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

    // By compiling only with ParsedContract.sol as the source, solc.compile returns file import errors for each import path.
    let output = solc.compile(JSON.stringify(solcStandardInput));
    output = JSON.parse(output);

    // Filter out the "pre-release compiler" warning, if present.
    const errors = output.errors.filter(
      ({ message }) => !message.includes(preReleaseCompilerWarning)
    );

    // If the import error key is not found, we must not have an import error.
    // This means we have a *different* parsing error which we should show to the user.
    // Note: solc can return multiple parsing errors at once.
    const nonImportErrors = errors.filter(
      ({ formattedMessage }) => !formattedMessage.includes(importErrorKey)
    );

    // Should we try to throw more than one? (aside; we didn't before)
    if (nonImportErrors.length > 0) {
      throw new CompileError(nonImportErrors[0].formattedMessage);
    }

    // Now, all errors must be import errors.
    // Filter out our forced import, then get the import paths of the rest.
    const imports = errors
      .filter(({ message }) => !message.includes(failingImportFileName))
      .map(({ formattedMessage }) => {
        const matches = formattedMessage.match(
          /import[^'"]+("|')([^'"]+)("|')/
        );

        // Return the item between the quotes.
        return matches[2];
      });

    return imports;
  }
};
