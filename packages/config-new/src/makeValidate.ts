import type { ProjectConfig } from "./types";
import type { Schema } from "./spec";

export type Validator<S extends Schema> = (
  options: ProjectConfig<{}>
) => options is ProjectConfig<S>;

export function makeValidate<A extends Schema>(a: Validator<A>): Validator<A>;

export function makeValidate<A extends Schema, B extends Schema>(
  a: Validator<A>,
  b: Validator<B>
): Validator<A & B>;

export function makeValidate<
  A extends Schema,
  B extends Schema,
  C extends Schema
>(a: Validator<A>, b: Validator<B>, c: Validator<C>): Validator<A & B & C>;

export function makeValidate<
  A extends Schema,
  B extends Schema,
  C extends Schema,
  D extends Schema
>(
  a: Validator<A>,
  b: Validator<B>,
  c: Validator<C>,
  d: Validator<D>
): Validator<A & B & C & D>;

export function makeValidate<
  A extends Schema,
  B extends Schema,
  C extends Schema,
  D extends Schema,
  E extends Schema
>(
  a: Validator<A>,
  b: Validator<B>,
  c: Validator<C>,
  d: Validator<D>,
  e: Validator<E>
): Validator<A & B & C & D & E>;

export function makeValidate<S extends Schema>(
  ...validators: any
): Validator<S> {
  return (options): options is ProjectConfig<S> => {
    for (const validate of validators) {
      if (!validate(options)) {
        return false;
      }
    }

    return true;
  };
}
// export const makeValidate = <S extends Schema, V extends readonly [...Validator<S>[]]>(
//   validators: V
// ): Validator<S> => (
//   options
// ): options is ProjectConfig<S> => {
//   for (const validate of validators) {
//     if (!validate(options)) {
//       return false;
//     };
//   }

//   return true;
// };

// export type Validators<L extends readonly [...Schema[]]> =
//   L extends []
//     ? never
//     : L extends [infer S]
//       ? readonly [Validator<S>]
//       : L extends [infer S, ...infer T]
//         ? T extends readonly [...Schema[]]
//           ? readonly [Validator<S>, ...Validators<T>]
//           : never
//         : L extends readonly (infer S)[]
//           ? S extends Schema
//             ? readonly Validator<S>[]
//             : never
//           : never;

// export type CombinedSchema<L extends readonly [...Schema[]]> = Schema & (
//   L extends []
//     ? never
//     : L extends [infer S]
//       ? S
//       : L extends [infer S, ...infer T]
//         ? T extends readonly [...Schema[]]
//           ? S & CombinedSchema<T>
//           : never
//         : never
// );

// export const makeValidate = <V extends Validators>(
//   validators: V
// ): Validator<ValidatorsSchema<V>> => (
//   options
// ): options is ProjectConfig<ValidatorsSchema<V>> => {
//   for (const validate of validators as unknown as Validator<Schema>[]) {
//     if (!validate(options)) {
//       return false;
//     };
//   }

//   return true;
// };

// export type Validators = readonly [...unknown[]];

// export type ValidatorsSchema<V extends Validators> =
//   V extends []
//     ? Schema
//     : V extends [Validator<infer H>, ...infer R]
//       ? H & ValidatorsSchema<R>
//       : V extends readonly [...Validator<infer W>[]]
//         ? W
//         : never;

// export type Validators<L extends Schema[]> = L extends []
//   ? []
//   : L extends [infer H, ...infer R]
//     ? H extends Schema
//       ? R extends Schema[]
//         ? readonly [Validator<H>, ...Validators<R>]
//         : never
//       : never
//     : L extends (infer S)[]
//       ? S extends Schema
//         ? readonly Validator<S>[]
//         : never
//       : never;

// type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
//   x: infer R
// ) => any
//   ? R
//   : never;

// export type CombinedSchema<L extends readonly [...Schema[]]> =
//   Schema & UnionToIntersection<L[number]>;
