import type {
  Collections,
  CollectionName,
  IdFields,
  Input,
  Resource,
  SavedInput
} from "@truffle/db/meta/collections";

type IdField<C extends Collections, N extends CollectionName<C>> = IdFields<
  C,
  N
>[number];

export type StrictIdInput<
  C extends Collections,
  N extends CollectionName<C>
> = IdField<C, N> extends keyof Input<C, N>
  ? Pick<Input<C, N>, IdField<C, N>>
  : Input<C, N>;

export type GenerateId<C extends Collections> = <N extends CollectionName<C>>(
  collectionName: N,
  input: Input<C, N> | StrictIdInput<C, N> | undefined
) => string | undefined;

export type SpecificGenerateId<
  C extends Collections,
  N extends CollectionName<C>
> = (
  input: Input<C, N> | StrictIdInput<C, N> | undefined
) => string | undefined;

export type IdObject<
  C extends Collections,
  N extends CollectionName<C> = CollectionName<C>,
  R extends Resource<C, N> | SavedInput<C, N> =
    | Resource<C, N>
    | SavedInput<C, N>
> = {
  [P in keyof R]: P extends "id" ? string : never;
};
