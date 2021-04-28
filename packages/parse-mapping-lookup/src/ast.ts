import debugModule from "debug";
const debug = debugModule("parse-mapping-lookup:ast");

import { Forms, definitions } from "./grammar";
import { Node, makeConstructors } from "./meta";

export type Identifier = Node<Forms, "identifier">;
export type StringLiteral = Node<Forms, "stringLiteral">;
export type ValueLiteral = Node<Forms, "valueLiteral">;
export type IndexAccess = Node<Forms, "indexAccess">;
export type MemberLookup = Node<Forms, "memberLookup">;
export type Pointer = Node<Forms, "pointer">;
export type Expression = Node<Forms, "expression">;

const constructors = makeConstructors<Forms>({ definitions });

export const {
  identifier,
  stringLiteral,
  valueLiteral,
  indexAccess,
  memberLookup,
  pointer,
  expression
} = constructors;
