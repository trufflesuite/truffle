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

export type Step = Access | Lookup;

export const pointer = (options: { path: Step[] }): Pointer => {
  const { path } = options;
  return {
    kind: "pointer",
    path
  };
};

/*
 * Lookup
 */

export interface Lookup {
  kind: "lookup";
  property: Identifier;
}

export const lookup = (options: { property: Identifier }): Lookup => {
  const { property } = options;
  return {
    kind: "lookup",
    property
  };
};

/*
 * Access
 */

export interface Access {
  kind: "access";
  index: Literal;
}

export const access = (options: { index: Literal }): Access => {
  const { index } = options;
  return {
    kind: "access",
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
