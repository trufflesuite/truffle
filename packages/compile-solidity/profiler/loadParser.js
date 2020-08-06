const CompilerSupplier = require("../compilerSupplier");
const Parser = require("../parser");
const semver = require("semver");

async function loadParser(options) {
  // Load compiler
  const supplierOptions = {
    parser: options.parser,
    events: options.events,
    solcConfig: options.compilers.solc
  };

  const supplier = new CompilerSupplier(supplierOptions);

  const { solc, parserSolc } = await supplier.load();

  // use explicit parser solc if defined, otherwise just default compiler solc
  return makeParseImports(parserSolc || solc);
}

function makeParseImports(parser) {
  const parseImports = body => {
    try {
      return Parser.parseImports(body, parser);
    } catch (err) {
      if (err.message.includes("requires different compiler version")) {
        const contractSolcPragma = err.message.match(/pragma solidity[^;]*/gm);
        // if there's a match provide the helpful error, otherwise return solc's error output
        if (contractSolcPragma) {
          const contractSolcVer = contractSolcPragma[0];
          const configSolcVer = semver.valid(solc.version());
          err.message = err.message.concat(
            `\n\nError: Truffle is currently using solc ${configSolcVer}, but one or more of your contracts specify "${contractSolcVer}".\nPlease update your truffle config or pragma statement(s).\n(See https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration for information on\nconfiguring Truffle to use a specific solc compiler version.)\n`
          );
        } else {
          err.message = `Error parsing ${currentFile}: ${err.message}`;
        }
      }

      throw err;
    }
  };

  return parseImports;
}

module.exports = { loadParser };
