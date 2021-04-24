import debugModule from "debug";
const debug = debugModule("parse-mapping-lookup:parser");

import {
  regexp,
  anyCharOf,
  noCharOf,
  stringLen,
  string,
  digit,
  int,
  float
} from "parjs";
import {
  qthen,
  map,
  exactly,
  many,
  manyBetween,
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
  hexLiteral,
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
    "\n": "\n",
    "\\": "\\",
    "'": "'",
    '"': '"',
    "b": "\b",
    "f": "\f",
    "n": "\n",
    "r": "\r",
    "t": "\t",
    "v": "\v",
    "/": "/",
  };

  const escapeCharP = anyCharOf(Object.keys(escapeChars).join()).pipe(
    map(char => escapeChars[char] as string)
  );

  const hexEscapeP = string("x").pipe(
    qthen(
      stringLen(2).pipe(
        map(str => parseInt(str, 16)),
        map(x => String.fromCharCode(x))
      )
    )
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
    qthen(
      escapeCharP.pipe(or(unicodeEscapeP, hexEscapeP))
    )
  );

  // Here we process regular characters vs escape sequences
  const stringEntriesP = escapeP.pipe(or(noCharOf('"')));

  // Repeat the char/escape to get a sequence, and then put between quotes to get a string
  export const stringP = stringEntriesP.pipe(many(), stringify(), between('"'));
}

const numberLiteralP = int().pipe(
  or(float()),
  map(value => numberLiteral({ value: value.toString() }))
);

const stringLiteralP = Strings.stringP.pipe(
  map(value => stringLiteral({ value }))
);

const booleanLiteralP = string("true").pipe(
  or(string("false")),
  map((value: "true" | "false") => booleanLiteral({ value: value === "true" }))
);

const hexLiteralP = digit(16).pipe(exactly(2)).pipe(
  map(pair => pair.join("")),
  manyBetween(string(`hex"`), string(`"`)),
  map(pairs => pairs.join("")),
  map(value => hexLiteral({ value: `0x${value}` }))
);

const literalP = numberLiteralP.pipe(
  or(
    stringLiteralP,
    booleanLiteralP,
    hexLiteralP
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
