import debugModule from "debug";
const debug = debugModule("parse-mapping-lookup:ast");

import { Forms, definitions } from "./grammar";
import { Node, makeConstructors } from "./meta";

export type Identifier = Node<Forms, "identifier">;
export type String = Node<Forms, "string">;
export type Value = Node<Forms, "value">;
export type IndexAccess = Node<Forms, "indexAccess">;
export type MemberLookup = Node<Forms, "memberLookup">;
export type Pointer = Node<Forms, "pointer">;
export type Expression = Node<Forms, "expression">;

const constructors = makeConstructors<Forms>({ definitions });

export const {
  identifier,
  string,
  value,
  indexAccess,
  memberLookup,
  pointer,
  expression
} = constructors;
