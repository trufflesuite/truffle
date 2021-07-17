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
    value: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: value({ contents: "0" }) })]
      })
    })
  },
  {
    expression: `m[0x0]`,
    value: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: value({ contents: "0x0" }) })]
      })
    })
  },
  {
    expression: `m["hello"]`,
    value: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: string({ contents: "hello" }) })]
      })
    })
  },
  {
    expression: `m["\\""]`,
    value: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: string({ contents: '"' }) })]
      })
    })
  },
  {
    expression: `s.m[0]`,
    value: expression({
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
    value: expression({
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
    value: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: string({ contents: "A" }) })]
      })
    })
  },
  {
    expression: `m[`,
    trace: {
      position: 2
    }
  },
  {
    expression: `m[1].s[]`,
    trace: {
      position: 7
    }
  },
  {
    expression: `m[hex"deadbeef"]`,
    value: expression({
      root: identifier({ name: "m" }),
      pointer: pointer({
        path: [indexAccess({ index: value({ contents: `hex"deadbeef"` }) })]
      })
    })
  },
  {
    expression: `m[Direction.North]`,
    value: expression({
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
  for (const testCase of testCases) {
    const { expression } = testCase;
    if (testCase.trace) {
      const { trace: expected } = testCase;

      it(`fails to parse: ${expression}`, () => {
        const result = parseExpression(expression);
        expect(result.isOk).toBe(false);
        expect(
          // @ts-ignore
          result.trace
        ).toMatchObject(expected);
      });
    } else {
      it(`parses: ${expression}`, () => {
        const { value: expected } = testCase;
        const result = parseExpression(expression);
        expect(result.isOk).toBeTruthy();
        expect(result.value).toEqual(expected);
      });
    }
  }
});
