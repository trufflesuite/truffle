import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:ids");

import { Collections, CollectionName, Resource } from "./collections";
import { soliditySha3 } from "web3-utils";
const jsonStableStringify = require("json-stable-stringify");

export type IdObject<
  C extends Collections,
  N extends CollectionName<C> | undefined = undefined
> = undefined extends N
  ? { id: string }
  : {
      [P in keyof Resource<C, N>]: P extends "id" ? string : never;
    };

export const toIdObject = <C extends Collections, N extends CollectionName<C>>({
  id
}: Resource<C, N>): IdObject<C, N> =>
  ({
    id
  } as IdObject<C, N>);

const removeNullyValues = obj =>
  Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ({ [k]: v }))
    .reduce((a, b) => ({ ...a, ...b }), {});

export const generateId = obj => {
  const id = soliditySha3(jsonStableStringify(removeNullyValues(obj)));
  return id;
};
