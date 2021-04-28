/**
 * Logic for parsing Solidity strings
 *
 * This borrows from and repurposes the
 * [parjs JSON example](https://github.com/GregRos/parjs/blob/master/src/examples/json.ts).
 *
 * @packageDocumentation
 */

import { string, anyCharOf, noCharOf, stringLen } from "parjs";
import { between, map, qthen, many, or, stringify } from "parjs/combinators";

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
  "/": "/"
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
  qthen(escapeCharP.pipe(or(unicodeEscapeP, hexEscapeP)))
);

// Here we process regular characters vs escape sequences
const stringEntriesP = escapeP.pipe(or(noCharOf('"')));

// Repeat the char/escape to get a sequence, and then put between quotes to get a string
export const solidityString = stringEntriesP.pipe(
  many(),
  stringify(),
  between('"')
);
