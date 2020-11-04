import { $, _ } from "hkts/src";

export { _ };

export type PrepareBatch<S, I, O, B = I, R = O> = (
  structured: $<S, [I]>
) => {
  batch: B[];
  unbatch: (results: R[]) => $<S, [O]>;
};
