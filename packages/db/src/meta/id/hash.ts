import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:id:hash");

import { soliditySha3, isNullish } from "web3-utils";
const jsonStableStringify = require("json-stable-stringify");

export function hash(obj): string {
  const id = soliditySha3(jsonStableStringify(removeNullyValues(obj)));
  if (isNullish(id)) {
    throw new Error(`Failed to hash ${JSON.stringify(obj)}`);
  }
  return id;
}

function removeNullyValues(obj) {
  return Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ({ [k]: v }))
    .reduce((a, b) => ({ ...a, ...b }), {});
}
