import type { Forms, FormKind, Node } from "./forms";

export type Constructors<F extends Forms> = {
  [K in FormKind<F>]: Constructor<F, K>;
};

export type Constructor<F extends Forms, K extends FormKind<F>> = (
  fields: Omit<Node<F, K>, "kind">
) => Node<F, K>;

export type MakeConstructorOptions<F extends Forms, K extends FormKind<F>> = {
  kind: K;
};

const makeConstructor = <F extends Forms, K extends FormKind<F>>(
  options: MakeConstructorOptions<F, K>
): Constructor<F, K> => {
  const { kind } = options;
  return fields => ({ kind, ...fields } as Node<F, K>);
};

export type Definition<F extends Forms, _K extends FormKind<F>> = any;
export type MakeConstructorsOptions<F extends Forms> = {
  definitions: {
    [K in FormKind<F>]: Definition<F, K>;
  };
};

export const makeConstructors = <F extends Forms>(
  options: MakeConstructorsOptions<F>
): Constructors<F> => {
  const { definitions } = options;
  return Object.keys(definitions)
    .map(kind => ({ [kind]: makeConstructor({ kind }) }))
    .reduce((a, b) => ({ ...a, ...b }), {}) as Constructors<F>;
};
