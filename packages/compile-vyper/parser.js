const debug = require("debug")("compile-vyper:parser");

// This needs to be fast! It is fast (as of this writing). Keep it fast!
async function parseImports(body, execVyperJson, resolver) {
  // WARNING: Kind of a hack (an expedient one).

  // So we don't have to maintain a separate parser, we'll get all the imports
  // in a file by sending the file to vyper and evaluating the error messages
  // to see what import statements couldn't be resolved. To prevent full-on
  // compilation when a file has no import statements, we inject an import
  // statement right on the end; just to ensure it will error and we can parse
  // the imports speedily without doing extra work.

  // (before we do all that, though, we'll try parsing as JSON
  // and return no imports if it parses, in case this gets passed
  // a JSON file!)
  try {
    JSON.parse(body);
    debug("was JSON, no imports");
    return []; //if we reach this point it was a JSON file
  } catch (_) {
    //it was Vyper, proceed onward
  }

  // Inject failing import.
  const failingImportFileName = "__Truffle__NotFound";

  body = `${body}\n\nimport ${failingImportFileName} as ${failingImportFileName}\n`;

  const outputSelection = { "*": [] }; //no output needed

  const vyperStandardInput = {
    language: "Vyper",
    sources: {
      "ParsedContract.vy": {
        content: body
      }
    },
    settings: {
      outputSelection
    },
    outputSelection //for older versions
  };

  // By compiling with only ParsedContract.vy as the source, we get file import errors for each import path.
  const output = JSON.parse(execVyperJson(JSON.stringify(vyperStandardInput)));

  // Filter out our forced import, then get the import paths of the rest.
  debug("raw output: %O", output);
  const imports = (
    await Promise.all(
      output.errors
        .filter(({ type }) => type === "FileNotFoundError")
        .filter(({ message }) => !message.includes(failingImportFileName))
        .map(({ message }) => {
          const matches = message.match(/interface '(.*)\{\.vy,\.json\}'/);

          debug("mathces: %o", matches);

          return matches ? matches[1] : undefined;
        })
        .filter(match => match !== undefined)
        .map(async bareName => {
          //HACK: at this point, we have the filenames *minus* the extensions
          //(.json or .vy).  We'll actually attempt to resolve the filename with
          //the extension, and return whichever one we find (or undefined if
          //neither).  If both exist we return .json as that's what Vyper does.
          //
          //Originally I was going to instead handle this by just returning the
          //filenames without extensions, and adding a special Vyper resolver type
          //that would perform this step, but I came to the conclusion that, while
          //possible, it wasn't a great fit for how resolvers work (because
          //currently we expect that the input to resolve() should be something like
          //a filename) and so it could possibly cause trouble down the line.  So
          //we've got this hack instead!

          debug("bareName: %s", bareName);

          const jsonName = bareName + ".json";
          const vyperName = bareName + ".vy";

          const { body: jsonBody } = await resolver.resolve(jsonName);
          if (jsonBody) {
            debug("found json");
            return jsonName;
          }
          const { body: vyperBody } = await resolver.resolve(vyperName);
          if (vyperBody) {
            debug("found vyper");
            return vyperName;
          }
          debug("not found");
          return undefined;
        })
    )
  ).filter(match => match !== undefined);

  return imports;
}

module.exports = {
  parseImports
};
