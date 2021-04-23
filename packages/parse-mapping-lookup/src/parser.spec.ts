import { parse } from "@truffle/parse-mapping-lookup/parser";

import {
  expression,
  indexAccess,
  memberLookup,
  identifier,
  pointer,
  literal
} from "@truffle/parse-mapping-lookup/ast";

const testCases = [
  {
    expression: `m[0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: literal({ value: "0" }) })]
      })
    })
  },
  {
    expression: `m[0][1]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [
          indexAccess({ index: literal({ value: "0" }) }),
          indexAccess({ index: literal({ value: "1" }) })
        ]
      })
    })
  },
  {
    expression: `m["hello"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: literal({ value: "hello" }) })]
      })
    })
  },
  {
    expression: `m["\\""]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: literal({ value: '"' }) })]
      })
    })
  },
  {
    expression: `s.m[0]`,
    result: expression({
      root: identifier({ name: "s" }),
      pointer: pointer({
        path: [
          memberLookup({ property: identifier({ name: "m" }) }),
          indexAccess({ index: literal({ value: "0" }) })
        ]
      })
    })
  },
  {
    expression: `m$[0]._k[1]`,
    result: expression({
      root: identifier({ name: "m$" }),
      pointer: pointer({
        path: [
          indexAccess({ index: literal({ value: "0" }) }),
          memberLookup({ property: identifier({ name: "_k" }) }),
          indexAccess({ index: literal({ value: "1" }) })
        ]
      })
    })
  }
];

describe("@truffle/parse-mapping-lookup", () => {
  for (const { expression, result: expected } of testCases) {
    it(`parses: ${expression}`, () => {
      const result = parse(expression);

      expect(result).toEqual(expected);
    });
  }
});
