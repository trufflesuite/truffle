/**
 * @module @truffle/preserve
 */ /** */

export { Target } from "./targets";
import * as Targets from "./targets";
export { Targets };

export { Recipe } from "./recipes";
import * as Recipes from "./recipes";
export { Recipes };

export { Process } from "./processes";
import * as Processes from "./processes";
export { Processes };

export * from "./preserve";
export * from "./run";
export * from "./console";

// type Config = {
//   target: {
//     kinds: IKind;
//   }
// }

// interface IKind {
// }

// type Kind<C extends Config> = C["target"]["kinds"];

// interface Target<C extends Config, K extends Kind<C> = Kind<C>> {
//   kind: K
// };

// interface Recipe {
// };

// interface Preserve {
// };

// type IdentifierRef<E> =
//   E extends Identifiable ? Identifier<E> : never;

// type Ref<E> =
//   | IdentifierRef<E>
//   | E;

// interface PreserveOptions<C extends Config> {
//   target: Ref<Target<C>>,
//   recipe: Ref<Recipe>
// };

// type PreserveFunc = <C extends Config>(
//   options: PreserveOptions<C>
// ) => Promise<Ref<Preserve>>;
