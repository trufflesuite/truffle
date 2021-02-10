const debug = require("debug")("compile-vyper:parser");
const OS = require("os");

function parseImports(body) {
  // WARNING: We're going to do this crudely with regexes!!
  //
  // Vyper has a rigid enough syntax that I think this is workable.
  //
  // We can't use the Solidity approach here of analyzing error messages
  // because the Vyper compiler will only provide an error for the *first*
  // failing import, not all of them.

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

  const stripWhitespace = str => str.replace(/\s/g, ""); //remove even internal whitespace

  //HACK: this isn't actually a correct way of handling line
  //extensions and comments... but it should be good enough
  //for our purposes!  I can't think of any cases that this
  //gets wrong *in a way that we care about*

  return (
    body
      .replace(/(#.*)\\\r?\n/g, "$1") //remove backslashes from end of comments
      // (this is the most-incorrect step; it will detect a "comment" even if
      // the # is used in a string literal.  but this shouldn't screw up imports,
      // so...)
      .replace(/\\\r?\n/g, " ") //process line extensions;
      //for convenience we use \r?\n instead of OS.EOL
      //(we don't care that this screws up string literals)
      .split(OS.EOL) //split body into lines
      .map(line => {
        //extract imports!
        const importRegex = /^import\b(.*?)\bas\b/;
        const fromImportRegex = /^from\b(.*?)\bimport\b(.*?)($|\bas\b)/;
        let matches;
        if ((matches = line.match(importRegex))) {
          const [_, path] = matches;
          return stripWhitespace(path);
        } else if ((matches = line.match(fromImportRegex))) {
          const [_, basePath, endPath] = matches;
          debug("basePath: %s; endPath: %s", basePath, endPath);
          const strippedBasePath = stripWhitespace(basePath);
          if (strippedBasePath === "vyper.interfaces") {
            //built-in import; we should not attempt to resolve it
            return null;
          }
          const strippedEndPath = stripWhitespace(endPath);
          return strippedBasePath.endsWith(".")
            ? `${strippedBasePath}${strippedEndPath}` //don't add extra "." for "from . import", etc
            : `${strippedBasePath}.${strippedEndPath}`;
          //on the endPath because
        } else {
          return null;
        }
      })
      .filter(moduleName => moduleName !== null)
  );
}

module.exports = {
  parseImports
};
