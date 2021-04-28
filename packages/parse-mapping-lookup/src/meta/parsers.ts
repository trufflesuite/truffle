import type { Parjser } from "parjs";

import type { Forms, FormKind, Node } from "./forms";

import type { Constructors, Constructor } from "./constructors";

export type ParserCombinator<F extends Forms, K extends FormKind<F>> = Parjser<
  Node<F, K>
>;

export type Tie<F extends Forms> = <K extends FormKind<F>>(
  kind: K
) => ParserCombinator<F, K>;

export type Definition<F extends Forms, K extends FormKind<F>> = (options: {
  construct: Constructor<F, K>;
  tie: Tie<F>;
}) => ParserCombinator<F, K>;

export type MakeParserCombinatorOptions<
  F extends Forms,
  K extends FormKind<F>
> = {
  kind: K;
  definition: Definition<F, K>;
  construct: Constructor<F, K>;
  tie: Tie<F>;
};

const makeParserCombinator = <F extends Forms, K extends FormKind<F>>(
  options: MakeParserCombinatorOptions<F, K>
): ParserCombinator<F, K> => {
  const { definition: parser, tie, construct } = options;

  return parser({ construct, tie });
};

// prettier-ignore
type ParserName<F extends Forms, K extends FormKind<F>> = /* eslint-disable no-undef */ `parse${Capitalize<K>}`;

export type Parsers<F extends Forms> = UnionToIntersection<
  {
    [K in FormKind<F>]: {
      [N in ParserName<F, K>]: ParserCombinator<F, K>["parse"];
    };
  }[FormKind<F>]
>;

export type MakeParsersOptions<F extends Forms> = {
  definitions: {
    [K in FormKind<F>]: Definition<F, K>;
  };
  constructors: Constructors<F>;
};

export const makeParsers = <F extends Forms>(
  options: MakeParsersOptions<F>
): Parsers<F> => {
  const { definitions, constructors } = options;
  const combinators: Partial<Parsers<F>> = {};

  function tie<K extends FormKind<F>>(kind: K) {
    if (kind in combinators) {
      // @ts-ignore
      return combinators[kind];
    }

    const definition = definitions[kind];
    // @ts-ignore
    const construct = constructors[kind];

    // @ts-ignore
    combinators[kind] = makeParserCombinator({
      kind,
      definition,
      tie,
      construct
    });
    // @ts-ignore
    return combinators[kind];
  }

  return Object.keys(definitions)
    .map(kind => [kind, `parse${kind.charAt(0).toUpperCase() + kind.slice(1)}`])
    .map(([kind, parserName]) => {
      const combinator = tie(kind);
      const parser = combinator.parse.bind(combinator);
      return { [parserName]: parser };
    })
    .reduce((a, b) => ({ ...a, ...b }), {}) as Parsers<F>;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
