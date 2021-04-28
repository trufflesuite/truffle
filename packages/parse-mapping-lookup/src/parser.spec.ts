import { parseExpression } from "@truffle/parse-mapping-lookup/parser";
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
        path: [indexAccess({ index: valueLiteral({ contents: "0" }) })]
      })
    })
  },
  {
    expression: `m[0x0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: valueLiteral({ contents: "0x0" }) })]
      })
    })
  },
  {
    expression: `m["hello"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: stringLiteral({ contents: "hello" }) })]
      })
    })
  },
  {
    expression: `m["\\""]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: stringLiteral({ contents: '"' }) })]
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
          indexAccess({ index: valueLiteral({ contents: "0" }) })
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
          indexAccess({ index: valueLiteral({ contents: "false" }) }),
          memberLookup({ property: identifier({ name: "_k" }) }),
          indexAccess({ index: valueLiteral({ contents: "true" }) })
        ]
      })
    })
  },
  {
    expression: `m["\\x41"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: stringLiteral({ contents: "A" }) })]
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
        path: [
          indexAccess({ index: valueLiteral({ contents: `hex"deadbeef"` }) })
        ]
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
            index: valueLiteral({ contents: "Direction.North" })
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
        const result = parseExpression(expression);
        expect(result.isOk).toBeFalsy();
      });
    } else {
      it(`parses: ${expression}`, () => {
        const result = parseExpression(expression);
        expect(result.isOk).toBeTruthy();
        expect(result.value).toEqual(expected);
      });
    }
  }
});
