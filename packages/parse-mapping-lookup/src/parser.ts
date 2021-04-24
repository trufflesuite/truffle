import debugModule from "debug";
const debug = debugModule("parse-mapping-lookup:parser");

import {
  regexp,
  anyCharOf,
  noCharOf,
  stringLen,
  string,
  int,
  float
} from "parjs";
import {
  qthen,
  map,
  many,
  stringify,
  between,
  or,
  then
} from "parjs/combinators";

import {
  indexAccess,
  expression,
  identifier,
  numberLiteral,
  stringLiteral,
  booleanLiteral,
  memberLookup,
  pointer
} from "./ast";

/*
 * Identifier
 */

const identifierP = regexp(/[a-zA-Z_$][a-zA-Z0-9_$]*/).pipe(
  map(([name]) => identifier({ name }))
);

/*
 * Literal
 */

namespace Strings {
  // borrowed from parjs JSON example
  // https://github.com/GregRos/parjs/blob/master/src/examples/json.ts

  const escapeChars = {
    '"': `"`,
    "\\": "\\",
    "/": "/",
    "f": "\f",
    "n": "\n",
    "r": "\r",
    "t": "\t"
  };

  const escapeCharP = anyCharOf(Object.keys(escapeChars).join()).pipe(
    map(char => escapeChars[char] as string)
  );

  // A unicode escape sequence is "u" followed by exactly 4 hex digits
  const unicodeEscapeP = string("u").pipe(
    qthen(
      stringLen(4).pipe(
        map(str => parseInt(str, 16)),
        map(x => String.fromCharCode(x))
      )
    )
  );

  // Any escape sequence begins with a \
  const escapeP = string("\\").pipe(
    qthen(escapeCharP.pipe(or(unicodeEscapeP)))
  );

  // Here we process regular characters vs escape sequences
  const stringEntriesP = escapeP.pipe(or(noCharOf('"')));

  // Repeat the char/escape to get a sequence, and then put between quotes to get a string
  export const stringP = stringEntriesP.pipe(many(), stringify(), between('"'));
}

const numberP = int().pipe(
  or(float()),
  map(value => numberLiteral({ value: value.toString() }))
);

const stringP = Strings.stringP.pipe(
  map(value => stringLiteral({ value }))
);

const booleanP = string("true").pipe(
  or(string("false")),
  map((value: "true" | "false") => booleanLiteral({ value: value === "true" }))
);

const literalP = numberP.pipe(
  or(
    stringP,
    booleanP
  )
);

/*
 * MemberLookup
 */

const memberLookupP = string(".").pipe(
  then(identifierP),
  map(([_, property]) => memberLookup({ property }))
);

/*
 * IndexAccess
 */

const indexAccessP = literalP.pipe(
  between(string("["), string("]")),
  map(index => indexAccess({ index }))
);

/*
 * Pointer
 */

const stepP = memberLookupP.pipe(or(indexAccessP));

const pointerP = stepP.pipe(
  then(stepP.pipe(many())),
  map(([first, rest]) => pointer({ path: [first, ...rest] }))
);

/*
 * Expression
 */

const expressionP = identifierP.pipe(
  then(pointerP),
  map(([root, pointer]) => expression({ root, pointer }))
);

export const parse = (expression: string) => {
  const result = expressionP.parse(expression);

  if (result.isOk) {
    return result.value;
  } else {
    throw new Error("Parse error");
  }
};
