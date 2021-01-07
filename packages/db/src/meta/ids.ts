import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:ids");

import { Resource } from "./collections";
import { soliditySha3 } from "web3-utils";
const jsonStableStringify = require("json-stable-stringify");

export type IdObject<R extends Resource = Resource> = {
  [N in keyof R]: N extends "id" ? string : never;
};

export const toIdObject = <R extends Resource>({ id }: R): IdObject<R> =>
  ({
    id
  } as IdObject<R>);

const removeNullyValues = obj =>
  Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ({ [k]: v }))
    .reduce((a, b) => ({ ...a, ...b }), {});

export const generateId = obj => {
  const id = soliditySha3(jsonStableStringify(removeNullyValues(obj)));
  return id;
};
