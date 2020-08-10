import * as LegacyConstructor from "./legacyConstructor";
import * as Constructor from "./constructor";

/*
 * top-level polymorphic type
 */
export type ConstructorArguments =
  | LegacyConstructor.Arguments // either the old-style tuple type
  | [Constructor.Options]; // or a single argument for new-style options
