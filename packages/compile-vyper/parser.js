const debug = require("debug")("compile-vyper:parser");
const OS = require("os");

function parseImports(body) {
  // WARNING: We're going to do this with crudely with regexes!!
  //
  // Vyper has a rigid enough syntax that I think this is workable.
  // (Although, there is a case that will fail :-/ -- see below.
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

  //NOTE: This is slightly incorrect if you have comments ending in
  //backslashes.  However, I'm not going to try to handle
  //comment-stripping, because that requires recognizing string
  //literals, which would be too much work.  So, <shrug>
  //
  //Basically the problem case is what if someone does this:
  //
  //#comment ending in a backslash \
  //import foo as Foo
  //
  //we'll get this case wrong, but doing better seems hard
  
  const stripWhitespace = str => str.replace(/\s/g, ""); //remove even internal whitespace

  return body
    .replace(/\\\r?\n/g, " ") //process line extensions;
    //for convenience we use \r?\n instead of OS.EOL
    //(we don't care that this screws up string literals)
    .split(OS.EOL) //split body into lines
    .map(line => {
      //extract imports!
      const importRegex = /^import\b(.*?)\bas\b/;
      const fromImportRegex = /^from\b(.*?)\bimport\b(.*?)\bas\b/;
      let matches;
      if (matches = line.match(importRegex)) {
        const [_, path] = matches;
        return stripWhitespace(path);
      } else if (matches = line.match(fromImportRegex)) {
        const [_, basePath, endPath] = matches;
        const strippedBasePath = stripWhitespace(basePath);
        if (strippedBasePath === "vyper.interfaces") {
          //built-in import; we should not attempt to resolve it
          return null;
        }
        return `${strippedBasePath}.${stripWhitespace(endPath)}`;
        //on the endPath because
      } else {
        return null;
      }
    })
    .filter(moduleName => moduleName !== null);

}

module.exports = {
  parseImports
};
