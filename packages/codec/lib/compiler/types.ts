export interface CompilerVersion {
  name?: string;
  version?: string;
  //NOTE: both these should really be present,
  //but they need to be optional for compilation reasons
}

//NOTE: Families 0.5.0 and up will be named by the lowest version that
//fits in the given family.  So e.g. 0.5.x covers 0.5.x-0.7.x;
//0.8.x covers 0.8.0-0.8.6; 0.8.7+ covers 0.8.7 to current (as I write this)
export type SolidityFamily =
  | "unknown"
  | "pre-0.5.0"
  | "0.5.x"
  | "0.8.x"
  | "0.8.7+"
  | "0.8.9+";

export interface Settings {
  //this type is deliberately incomplete,
  //it only includes the settings that Codec cares about,
  //of which at present this is the only one.
  viaIR?: boolean;
}
