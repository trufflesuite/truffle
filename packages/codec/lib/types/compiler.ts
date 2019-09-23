export interface CompilerVersion {
  name?: string;
  version?: string;
  //NOTE: both these should really be present,
  //but they need to be optional for compilation reasons
}

export type SolidityFamily = "pre-0.5.0" | "0.5.x";
