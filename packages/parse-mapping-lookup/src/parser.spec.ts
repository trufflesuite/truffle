import { parse } from "@truffle/parse-mapping-lookup/parser";

import {
  expression,
  indexAccess,
  memberLookup,
  identifier,
  pointer,
  numberLiteral,
  stringLiteral,
  booleanLiteral
} from "@truffle/parse-mapping-lookup/ast";

const testCases = [
  {
    expression: `m[0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: numberLiteral({ value: "0" }) })]
      })
    })
  },
  {
    expression: `m[0][1]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [
          indexAccess({ index: numberLiteral({ value: "0" }) }),
          indexAccess({ index: numberLiteral({ value: "1" }) })
        ]
      })
    })
  },
  {
    expression: `m["hello"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: stringLiteral({ value: "hello" }) })]
      })
    })
  },
  {
    expression: `m["\\""]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: stringLiteral({ value: '"' }) })]
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
          indexAccess({ index: numberLiteral({ value: "0" }) })
        ]
      })
    })
  },
  {
    expression: `m$[false]._k[true]`,
    result: expression({
      root: identifier({ name: "m$" }),
      pointer: pointer({
        path: [
          indexAccess({ index: booleanLiteral({ value: false }) }),
          memberLookup({ property: identifier({ name: "_k" }) }),
          indexAccess({ index: booleanLiteral({ value: true }) })
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
