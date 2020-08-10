import * as LegacyConstructor from "./LegacyConstructor";
import * as Constructor from "./Constructor";

/*
 * top-level polymorphic type
 */
export type ConstructorArguments =
  | LegacyConstructor.Arguments // either the old-style tuple type
  | [Constructor.Options]; // or a single argument for new-style options
