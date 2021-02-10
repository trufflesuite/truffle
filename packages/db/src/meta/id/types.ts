import type {
  Collections,
  CollectionName,
  IdFields,
  Input,
  Resource
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
  input: Input<C, N> | StrictIdInput<C, N>
) => string;

export type SpecificGenerateId<
  C extends Collections,
  N extends CollectionName<C>
> = (input: Input<C, N> | StrictIdInput<C, N>) => string;

export type IdObject<
  C extends Collections,
  N extends CollectionName<C> | undefined = undefined
> = undefined extends N
  ? { id: string }
  : {
      [P in keyof Resource<C, N>]: P extends "id" ? string : never;
    };
