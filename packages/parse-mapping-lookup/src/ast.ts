import debugModule from "debug";
const debug = debugModule("parse-mapping-lookup:ast");

/*
 * Expression
 */

export interface Expression {
  kind: "expression";
  root: Identifier;
  pointer: Pointer;
}

export const expression = (options: {
  root: Identifier;
  pointer: Pointer;
}): Expression => {
  const { root, pointer } = options;
  return {
    kind: "expression",
    root,
    pointer
  };
};

/*
 * Identifier
 */

export interface Identifier {
  kind: "identifier";
  name: string;
}

export const identifier = (options: { name: string }): Identifier => {
  const { name } = options;
  return {
    kind: "identifier",
    name
  };
};

/*
 * Pointer
 */

export interface Pointer {
  kind: "pointer";
  path: Step[];
}

export type Step = IndexAccess | MemberLookup;

export const pointer = (options: { path: Step[] }): Pointer => {
  const { path } = options;
  return {
    kind: "pointer",
    path
  };
};

/*
 * MemberLookup
 */

export interface MemberLookup {
  kind: "member-lookup";
  property: Identifier;
}

export const memberLookup = (options: {
  property: Identifier;
}): MemberLookup => {
  const { property } = options;
  return {
    kind: "member-lookup",
    property
  };
};

/*
 * IndexAccess
 */

export interface IndexAccess {
  kind: "index-access";
  index: Literal;
}

export const indexAccess = (options: { index: Literal }): IndexAccess => {
  const { index } = options;
  return {
    kind: "index-access",
    index
  };
};

/*
 * Literal
 */

export interface Literal {
  kind: "literal";
  value: string;
}

export const literal = (options: { value: string }): Literal => {
  const { value } = options;
  return {
    kind: "literal",
    value
  };
};
