export interface CompilerVersion {
  name?: string;
  version?: string;
  //NOTE: both these should really be present,
  //but they need to be optional for compilation reasons
}

//Note: 0.5.x should really be 0.5.x or 0.6.x, but for the sake
//of not breaking things, I'm going to avoid changing this until
//there's a need (which might happen when 0.7.x hits)
export type SolidityFamily = "unknown" | "pre-0.5.0" | "0.5.x";
