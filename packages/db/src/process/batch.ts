import { $, _ } from "hkts/src";

export { _ };

export type PrepareBatch<S, I, O, B = I, R = O> = (
  inputs: $<S, [I]>
) => {
  batch: B[];
  unbatch: (results: R[]) => $<S, [O]>;
};

type Extracts<I, E> = {
  extract(options: { input: I }): E;
};

type MaybeExtracts<I, E> = I extends E
  ? E extends I
    ? {}
    : Extracts<I, E>
  : Extracts<I, E>;

type Converts<S, I, O, R> = {
  convert(options: { result: R; inputs: $<S, [I]>; input: I }): O;
};

type MaybeConverts<S, I, O, R> = O extends R
  ? R extends O
    ? {}
    : Converts<S, I, O, R>
  : Converts<S, I, O, R>;

export type BatchOptions<S, C, I, O, R = O, E = I> = {
  iterate(options: {
    inputs: $<S, [I]>;
  }): Iterable<{ input: I; breadcrumb: C }>;

  find(options: { inputs: $<S, [I]>; breadcrumb: C }): I;

  initialize(options: { inputs: $<S, [I]> }): $<S, [O]>;

  merge(options: { outputs: $<S, [O]>; breadcrumb: C; output: O }): $<S, [O]>;

  extract?(options: { input: I }): E;
  convert?(options: { result: R; inputs: $<S, [I]>; input: I }): O;
} & MaybeExtracts<I, E> &
  MaybeConverts<S, I, O, R>;

export const configure = <S, C, I, O, R = O, E = I>(
  options: BatchOptions<S, C, I, O, R, E>
): PrepareBatch<S, I, O, E, R> => {
  const { iterate, find, initialize, merge } = options;

  const extract = "extract" in options ? options.extract : x => x;

  const convert = "convert" in options ? options.convert : x => x;

  return (inputs: $<S, [I]>) => {
    const batch: E[] = [];
    const breadcrumbs: {
      [index: number]: C;
    } = {};

    for (const { input, breadcrumb } of iterate({ inputs })) {
      const entry: E = extract({ input });

      breadcrumbs[batch.length] = breadcrumb;

      batch.push(entry);
    }

    const unbatch = (results: R[]) =>
      results.reduce((outputs, result, index) => {
        const breadcrumb = breadcrumbs[index];
        const input = find({ inputs, breadcrumb });
        const output = convert({ result, input, inputs });

        return merge({ outputs, output, breadcrumb });
      }, initialize({ inputs }));

    return { batch, unbatch };
  };
};
