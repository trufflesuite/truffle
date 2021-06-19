import type { ProjectConfig } from "./types";
import type { Schema } from "./spec";

export const makeValidate = <L extends Schema[]>(
  validators: Validators<L>
): Validator<CombinedSchema<L>> => options => {
  for (const validate of validators) {
    validate(options);
  }
};

export type Validator<S extends Schema> = (
  options: ProjectConfig<{}>
) => asserts options is ProjectConfig<S>;

export type Validators<L extends Schema[]> = L extends []
  ? []
  : L extends [infer H, ...infer R]
  ? H extends Schema
    ? R extends Schema[]
      ? readonly [Validator<H>, ...Validators<R>]
      : never
    : never
  : L extends Array<infer S>
  ? S extends Schema
    ? readonly Validator<S>[]
    : never
  : never;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

export type CombinedSchema<L extends Schema[]> = Schema &
  UnionToIntersection<L[number]>;
