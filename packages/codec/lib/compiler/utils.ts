import debugModule from "debug";
const debug = debugModule("codec:compiler:utils");

import semver from "semver";
import { CompilerVersion, SolidityFamily } from "./types";

export function solidityFamily(compiler: CompilerVersion): SolidityFamily {
  if (!compiler || compiler.name !== "solc") {
    return "unknown";
  }
  if (
    semver.satisfies(compiler.version, "~0.5 || >=0.5.0", {
      includePrerelease: true
    })
  ) {
    //what's with this weird-looking condition?  Well, I want to be sure to include
    //prerelease versions of 0.5.0.  But isn't that what the includePrerelease option
    //does?  No!  That just makes it so that prerelease versions can be included at
    //all; without that, all prereleases of *any* version of Solidity can be excluded.
    //A prerelease version of 0.5.0 still wouldn't satisfy >=0.5.0, so I added in ~0.5
    //as well, which they do satisfy.
    return "0.5.x";
  } else {
    return "pre-0.5.0";
  }
}
