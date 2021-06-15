import type * as LegacyConstructor from "./LegacyConstructor";
import type * as Constructor from "./Constructor";

/*
 * top-level polymorphic type
 */
export type ConstructorArguments =
  | LegacyConstructor.Arguments // either the old-style tuple type
  | [Constructor.InputOptions]; // or polymorphic new-style options
