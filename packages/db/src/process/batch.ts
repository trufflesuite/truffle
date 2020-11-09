import { $, _ } from "hkts/src";

import { Collections } from "@truffle/db/meta";
import { Process } from "./types";

export { _ };

export type PrepareBatch<S, I, O, B = I, R = O> = (
  inputs: $<S, [I]>
) => {
  batch: B[];
  unbatch: (results: R[]) => $<S, [O]>;
};

type Batch = {
  structure: any;
  breadcrumb: any;
  input: any;
  entry?: any;
  result?: any;
  output: any;
};

type Structure<B extends Batch> = B["structure"];

type Breadcrumb<B extends Batch> = B["breadcrumb"];
type Breadcrumbs<B extends Batch> = {
  [index: number]: Breadcrumb<B>;
};

export type Input<B extends Batch> = B["input"];
export type Inputs<B extends Batch, I extends Input<B>> = $<Structure<B>, [I]>;

type Entry<B extends Batch> = B["entry"];
type Entries<B extends Batch> = Entry<B>[];

export type Output<B extends Batch> = B["output"];
export type Outputs<B extends Batch, O extends Output<B>> = $<
  Structure<B>,
  [O]
>;

type Result<B extends Batch> = B["result"];
type Results<B extends Batch> = Result<B>[];

export type Options<B extends Batch> = {
  process<I extends Input<B>, _O extends Output<B>>(options: {
    batch: Entries<B>;
    inputs: Inputs<B, I>;
  }): Process<Collections, Results<B>>;

  iterate<I extends Input<B>, _O extends Output<B>>(options: {
    inputs: Inputs<B, I>;
  }): Iterable<{
    input: I;
    breadcrumb: Breadcrumb<B>;
  }>;

  find<I extends Input<B>, _O extends Output<B>>(options: {
    inputs: Inputs<B, I>;
    breadcrumb: Breadcrumb<B>;
  }): I;

  initialize<I extends Input<B>, O extends Output<B>>(options: {
    inputs: Inputs<B, I>;
  }): Outputs<B, O>;

  merge<_I extends Input<B>, O extends Output<B>>(options: {
    outputs: Outputs<B, O>;
    breadcrumb: Breadcrumb<B>;
    output: O;
  }): Outputs<B, O>;

  extract<I extends Input<B>, _O extends Output<B>>(options: {
    input: I;
    inputs: Inputs<B, I>;
    breadcrumb: Breadcrumb<B>;
  }): Entry<B>;

  convert<I extends Input<B>, O extends Output<B>>(options: {
    result: Result<B>;
    inputs: Inputs<B, I>;
    input: I;
  }): O;
};

export const configure = <B extends Batch>(
  options: Options<B>
): (<I extends Input<B>, O extends Output<B>>(
  inputs: Inputs<B, I>
) => Process<Collections, Outputs<B, O>>) => {
  const {
    process,
    extract,
    convert,
    iterate,
    find,
    initialize,
    merge
  } = options;

  return function*<I extends Input<B>, O extends Output<B>>(
    inputs: Inputs<B, I>
  ): Process<Collections, Outputs<B, O>> {
    const batch: Entries<B> = [];
    const breadcrumbs: Breadcrumbs<B> = {};

    for (const { input, breadcrumb } of iterate<I, O>({ inputs })) {
      const entry: Entry<B> = extract<I, O>({ input, inputs, breadcrumb });

      breadcrumbs[batch.length] = breadcrumb;

      batch.push(entry);
    }

    const results = yield* process({ batch, inputs });

    return results.reduce(
      (outputs: Outputs<B, O>, result: Result<B>, index: number) => {
        const breadcrumb = breadcrumbs[index];
        const input = find<I, O>({ inputs, breadcrumb });
        const output = convert<I, O>({ result, input, inputs });

        return merge({ outputs, output, breadcrumb });
      },
      initialize<I, O>({ inputs })
    ) as Outputs<B, O>;
  };
};
