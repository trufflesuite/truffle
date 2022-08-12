import { CompilerSupplier } from "../compilerSupplier";
import { Parser } from "../parser";
import semver, { SemVer } from "semver";
import type Config from "@truffle/config";

/**
 * Loads solc and wrap it to parse imports rather than performing a full
 * compilation. Returns the wrapped form.
 *
 * This function optionally accepts an `parser` param, whose only possible
 * value is `"solcjs"`. Passing this option indicates that the imports-parser
 * should use a wrapped soljson module instead of whatever normal compiler
 * the user would use. NOTE that as a result, this function may download solc
 * up to twice: first time as usual, to get the specific version, then a second
 * time to get the solcjs of that version.
 */
export async function loadParser({
  events,
  compilers: { solc: solcConfig }
}: Config) {
  const { parser } = solcConfig;

  const supplier = new CompilerSupplier({ events, solcConfig });
  const { solc } = await supplier.load();

  // if no parser is specified, just use the normal solc
  if (!parser) {
    return makeParseImports(solc);
  }

  // otherwise, there's only one choice...
  if (parser !== "solcjs") {
    throw new Error(
      `Unsupported parser "${parser}" found in truffle-config.js`
    );
  }

  // determine normal solc version and then load that version as solcjs
  const result: SemVer | null = semver.coerce(solc.version());
  if (!result) {
    throw new Error(`Could not determine version from ${solc.version}.`);
  }
  const parserSupplier = new CompilerSupplier({
    events,
    solcConfig: {
      ...solcConfig,
      version: result.version,
      docker: false
    }
  });
  const { solc: parserSolc } = await parserSupplier.load();

  return makeParseImports(parserSolc);
}

function makeParseImports(parser: any) {
  const parseImports = (body: string) => {
    try {
      return Parser.parseImports(body, parser);
    } catch (err) {
      if (err.message.includes("requires different compiler version")) {
        const contractSolcPragma = err.message.match(/pragma solidity[^;]*/gm);
        // if there's a match provide the helpful error, otherwise return solc's error output
        if (contractSolcPragma) {
          const contractSolcVer = contractSolcPragma[0];
          const configSolcVer = semver.valid(parser.version());
          err.message = err.message.concat(
            `\n\nError: Truffle is currently using solc ${configSolcVer}, but one or more of your contracts specify "${contractSolcVer}".\nPlease update your truffle config or pragma statement(s).\n(See https://trufflesuite.com/docs/truffle/reference/configuration#compiler-configuration for information on\nconfiguring Truffle to use a specific solc compiler version.)\n`
          );
        } else {
          err.message =
            `Parsing error: ${err.message}.\nThe error occurred ` +
            `while parsing the following source material: ${body}.`;
        }
      }

      throw err;
    }
  };

  return parseImports;
}
