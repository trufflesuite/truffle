/*
 * Identifiers
 */

export type Id = string;

type Identifiable = {
  id: Id;
};

export type Identifier<R extends Identifiable = Identifiable> = {
  [N in keyof R]: N extends "id" ? string : never
};

export const toIdentifier = <I extends Identifiable>({
  id
}: I): Identifier<I> =>
  ({
    id
  } as Identifier<I>);
