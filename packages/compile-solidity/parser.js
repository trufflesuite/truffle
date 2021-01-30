const debug = require("debug")("compile:parser");

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

    // Filter out our forced import, then get the import paths of the rest.
    const imports = errors
      .filter(({ message }) => !message.includes(failingImportFileName))
      .map(({ formattedMessage, message }) => {
        // Multiline import check which works for solcjs and solc
        // solcjs: ^ (Relevant source part starts here and spans across multiple lines)
        // solc: Spanning multiple lines.
        if (formattedMessage.includes("multiple lines")) {
          // Parse the import filename from the error message, this does not include the full path to the import
          const matches = message.match(/Source[^'"]?.*?("|')([^'"]+)("|')/);
          if (matches) {
            // Extract the full path by matching against body with the import filename
            const fullPathRegex = new RegExp(`("|')(.*${matches[2]})("|')`);
            const importMatches = body.match(fullPathRegex);
            if (importMatches) return importMatches[2];
          }
        } else {
          const matches = formattedMessage.match(
            /import[^'"]?.*("|')([^'"]+)("|')/
          );

          // Return the item between the quotes.
          if (matches) return matches[2];
        }
      })
      .filter(match => match !== undefined);

    return imports;
  }
};
