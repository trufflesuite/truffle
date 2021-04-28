import { string, regexp, noCharOf } from "parjs";
import { between, map, then, qthen, many, or } from "parjs/combinators";

import { Definitions } from "./meta";

import { solidityString } from "./string";

export type Forms = {
  identifier: {
    name: { type: string };
  };
  stringLiteral: {
    contents: { type: string };
  };
  valueLiteral: {
    contents: { type: string };
  };
  indexAccess: {
    index: { kind: "stringLiteral" | "valueLiteral" };
  };
  memberLookup: {
    property: { kind: "identifier" };
  };
  pointer: {
    path: Array<{ kind: "memberLookup" | "indexAccess" }>;
  };
  expression: {
    root: { kind: "identifier" };
    pointer: { kind: "pointer" };
  };
};

export const definitions: Definitions<Forms> = {
  identifier: ({ construct }) =>
    regexp(/[a-zA-Z_$][a-zA-Z0-9_$]*/).pipe(
      map(([name]) => construct({ name }))
    ),

  stringLiteral: ({ construct }) =>
    solidityString.pipe(map(contents => construct({ contents }))),

  valueLiteral: ({ construct }) =>
    noCharOf("]").pipe(
      many(),
      map(characters => construct({ contents: characters.join("") }))
    ),

  indexAccess: ({ construct, tie }) =>
    tie("stringLiteral").pipe(
      or(tie("valueLiteral")),
      between(string("["), string("]")),
      map(index => construct({ index }))
    ),

  memberLookup: ({ construct, tie }) =>
    string(".").pipe(
      qthen(tie("identifier")),
      map(property => construct({ property }))
    ),

  pointer: ({ construct, tie }) => {
    const stepP = tie("memberLookup").pipe(or(tie("indexAccess")));

    return stepP.pipe(
      then(stepP.pipe(many())),
      map(([first, rest]) => construct({ path: [first, ...rest] }))
    );
  },

  expression: ({ construct, tie }) =>
    tie("identifier").pipe(
      then(tie("pointer")),
      map(([root, pointer]) => construct({ root, pointer }))
    )
};
