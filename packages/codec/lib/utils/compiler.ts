import debugModule from "debug";
const debug = debugModule("codec:utils:compiler");

import semver from "semver";
import { CompilerVersion, SolidityFamily } from "@truffle/codec/types/compiler";

export function solidityFamily(compiler: CompilerVersion): SolidityFamily {
  if(semver.satisfies(compiler.version, "~0.5 || >=0.5.0", {includePrerelease: true})) {
    return "0.5.x";
  }
  else {
    return "pre-0.5.0";
  }
}
