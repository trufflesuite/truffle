import semver from "semver";

export interface CompilerVersion {
  name?: string;
  version?: string;
  //NOTE: both these should really be present,
  //but they need to be optional for compilation reasons
}

export type SolidityFamily = "pre-0.5.0" | "0.5.x";

export function solidityFamily(compiler: CompilerVersion): SolidityFamily {
  if(semver.satisfies(compiler.version, "~0.5 || >=0.5.0", {includePrerelease: true})) {
    return "0.5.x";
  }
  else {
    return "pre-0.5.0";
  }
}
