import { $, _ } from "hkts/src";

export { _ };

export type PrepareBatch<S, I, O, B = I, R = O> = (
  structured: $<S, [I]>
) => {
  batch: B[];
  unbatch: (results: R[]) => $<S, [O]>;
};

export type Replacements = {
  [key: string]: any;
};

export type Replace<T, R extends Replacements> = {
  [N in keyof R | keyof T]: N extends keyof R
    ? R[N]
    : N extends keyof T
    ? T[N]
    : never;
};
