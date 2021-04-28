import { parse } from "@truffle/parse-mapping-lookup/parser";

import {
  expression,
  indexAccess,
  memberLookup,
  identifier,
  pointer,
  stringLiteral,
  valueLiteral
} from "@truffle/parse-mapping-lookup/ast";

const testCases = [
  {
    expression: `m[0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: valueLiteral({ value: "0" }) })]
      })
    })
  },
  {
    expression: `m[0x0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: valueLiteral({ value: "0x0" }) })]
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
          indexAccess({ index: valueLiteral({ value: "0" }) })
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
          indexAccess({ index: valueLiteral({ value: "false" }) }),
          memberLookup({ property: identifier({ name: "_k" }) }),
          indexAccess({ index: valueLiteral({ value: "true" }) })
        ]
      })
    })
  },
  {
    expression: `m["\\x41"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: stringLiteral({ value: "A" }) })]
      })
    })
  },
  {
    expression: `m[`,
    errors: true
  },
  {
    expression: `m[hex"deadbeef"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: valueLiteral({ value: `hex"deadbeef"` }) })]
      })
    })
  },
  {
    expression: `m[Direction.North]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [
          indexAccess({
            index: valueLiteral({
              value: "Direction.North"
            })
          })
        ]
      })
    })
  }
];

describe("@truffle/parse-mapping-lookup", () => {
  for (const { expression, errors = false, result: expected } of testCases) {
    if (errors) {
      it(`fails to parse: ${expression}`, () => {
        expect(() => {
          return parse(expression);
        }).toThrow();
      });
    } else {
      it(`parses: ${expression}`, () => {
        const result = parse(expression);
        expect(result).toEqual(expected);
      });
    }
  }
});
