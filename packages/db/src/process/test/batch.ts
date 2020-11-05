import { PrepareBatch, _ } from "@truffle/db/process/batch";

describe("PrepareBatch", () => {
  test("supports trivial case (arrays)", () => {
    type S = _[];
    type Prepare = PrepareBatch<S, number, string>;

    const structured = [1, 2, 3];
    const expected = ["1", "2", "3"];

    const prepareBatch: Prepare = batch => ({
      batch,
      unbatch: results => results
    });

    const { batch, unbatch } = prepareBatch(structured);

    const results = batch.map(n => n.toString());
    expect(unbatch(results)).toEqual(expected);
  });

  it("supports object mappings", () => {
    type S = { [key: string]: _ };
    type Prepare = PrepareBatch<S, number, string>;

    const structured = {
      foo: 1,
      bar: 2,
      baz: 3
    };

    const expected = {
      foo: "1",
      bar: "2",
      baz: "3"
    };

    const prepareBatch: Prepare = structured => {
      const batch = [];
      const keys = {};
      for (const [key, value] of Object.entries(structured)) {
        keys[batch.length] = key;

        batch.push(value);
      }

      const unbatch = results =>
        results
          .map((result, index) => ({
            [keys[index]]: result
          }))
          .reduce((a, b) => ({ ...a, ...b }), {});

      return { batch, unbatch };
    };

    const { batch, unbatch } = prepareBatch(structured);

    const results = batch.map(n => n.toString());

    expect(unbatch(results)).toEqual(expected);
  });

  it("supports nested structurings", () => {
    type S = { [key: string]: _[] };
    type Prepare = PrepareBatch<S, number, string>;

    const structured = {
      b: [5, 6],
      a: [1, 2, 3],
      c: [5]
    };

    const expected = {
      b: ["5", "6"],
      a: ["1", "2", "3"],
      c: ["5"]
    };

    const prepareBatch: Prepare = structured => {
      const batch = [];
      const keyIndexes = {};
      for (const [key, values] of Object.entries(structured)) {
        for (const [index, value] of values.entries()) {
          keyIndexes[batch.length] = { key, index };

          batch.push(value);
        }
      }

      const unbatch = results => {
        const withKeyIndex = results.map((result, index) => ({
          result,
          keyIndex: keyIndexes[index]
        }));

        const byKey = withKeyIndex.reduce(
          (obj, { result, keyIndex: { key, index } }) => ({
            ...obj,

            [key]: [...(obj[key] || []), { result, index }]
          }),
          {}
        );

        const order = indexedResults => {
          const ordered = [];
          for (const { result, index } of indexedResults) {
            ordered[index] = result;
          }
          return ordered;
        };

        return Object.entries(byKey)
          .map(([key, results]) => ({
            [key]: order(results)
          }))
          .reduce((a, b) => ({ ...a, ...b }), {});
      };

      return { batch, unbatch };
    };

    const { batch, unbatch } = prepareBatch(structured);

    const results = batch.map(n => n.toString());
    expect(unbatch(results)).toEqual(expected);
  });

  it("supports transformed batching", () => {
    type S = _[];
    type Wrap<T> = { wrapped: T };

    type Prepare = PrepareBatch<S, Wrap<number>, Wrap<string>, number, string>;

    const structured = [{ wrapped: 1 }, { wrapped: 2 }, { wrapped: 3 }];
    const expected = [{ wrapped: "1" }, { wrapped: "2" }, { wrapped: "3" }];

    const prepareBatch: Prepare = structured => ({
      batch: structured.map(({ wrapped }) => wrapped),
      unbatch: results => results.map(wrapped => ({ wrapped }))
    });

    const { batch, unbatch } = prepareBatch(structured);

    const results = batch.map(n => n.toString());
    expect(unbatch(results)).toEqual(expected);
  });
});

/*
const options: BatchOptions<
  _[],
  number,
  { i: number },
  { o: number },
  { r: number },
  { e: number }
> = {
  *iterate({ structured }) {
    for (const [index, input] of structured.entries()) {
      yield {
        input,
        breadcrumb: index
      }
    }
  },

  collect({ outputs, breadcrumbs }) {
    const structured = [];
    for (const [index, output] of outputs.entries()) {
      structured[breadcrumbs[index]] = output;
    }
    return structured;
  },

  extract(options) {
    const {
      input: { i }
    } = options;
    return { e: i };
  },

  convert(options) {
    const {
      result: { r }
    } = options;

    return { o: r };
  }
}
*/
