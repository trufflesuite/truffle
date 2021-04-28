import { parseExpression } from "@truffle/parse-mapping-lookup/parser";
import {
  expression,
  indexAccess,
  memberLookup,
  identifier,
  pointer,
  string,
  value
} from "@truffle/parse-mapping-lookup/ast";

const testCases = [
  {
    expression: `m[0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: value({ contents: "0" }) })]
      })
    })
  },
  {
    expression: `m[0x0]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: value({ contents: "0x0" }) })]
      })
    })
  },
  {
    expression: `m["hello"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: string({ contents: "hello" }) })]
      })
    })
  },
  {
    expression: `m["\\""]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: string({ contents: '"' }) })]
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
          indexAccess({ index: value({ contents: "0" }) })
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
          indexAccess({ index: value({ contents: "false" }) }),
          memberLookup({ property: identifier({ name: "_k" }) }),
          indexAccess({ index: value({ contents: "true" }) })
        ]
      })
    })
  },
  {
    expression: `m["\\x41"]`,
    result: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: string({ contents: "A" }) })]
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
        path: [indexAccess({ index: value({ contents: `hex"deadbeef"` }) })]
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
            index: value({ contents: "Direction.North" })
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
