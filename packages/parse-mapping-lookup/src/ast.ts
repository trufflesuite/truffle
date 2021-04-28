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

namespace LiteralGenerics {
  type Literals = {
    [type: string]: {
      kind: "literal";
      type: string;
      value: any;
    };
  };

  type LiteralName<L extends Literals> = string & keyof L;
  type Literal<L extends Literals, N extends LiteralName<L>> = {
    kind: "literal";
    type: N;
    value: L[N]["value"];
  };

  type Definition<L extends Literals, _N extends LiteralName<L>> = {};
  type Definitions<L extends Literals> = {
    [N in LiteralName<L>]: Definition<L, N>;
  };

  type Constructor<L extends Literals, N extends LiteralName<L>> = (
    options: Pick<Literal<L, N>, "value">
  ) => Literal<L, N>;

  // prettier-ignore
  export type ConstructorName<L extends Literals, N extends LiteralName<L>> = `${N}Literal`;
  type UnionToIntersection<U> = (
    U extends any ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never;
  export type Constructors<L extends Literals> = UnionToIntersection<
    {
      [N in LiteralName<L>]: {
        [K in ConstructorName<L, N>]: Constructor<L, N>;
      };
    }[LiteralName<L>]
  >;

  const makeConstructor = <L extends Literals, N extends LiteralName<L>>(
    type: N
  ): Constructor<L, N> => ({ value }: Pick<Literal<L, N>, "value">) => ({
    kind: "literal" as const,
    type,
    value
  });

  export const makeConstructors = <L extends Literals>(
    definitions: Definitions<L>
  ): Constructors<L> =>
    Object.keys(definitions)
      .map(type => ({ [`${type}Literal`]: makeConstructor(type) }))
      .reduce((a, b) => ({ ...a, ...b }), {}) as Constructors<L>;
}

/*
 * Literal
 */

export interface Literal {
  kind: "literal";
  type: string;
  value: any;
}

export interface StringLiteral extends Literal {
  type: "string";
  value: string;
}

export interface ValueLiteral extends Literal {
  type: "hex";
  value: string;
}

export const {
  stringLiteral,
  valueLiteral
} = LiteralGenerics.makeConstructors<{
  string: StringLiteral;
  value: ValueLiteral;
}>({
  string: {},
  value: {}
} as const);
