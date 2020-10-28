import { logger } from "@truffle/db/logger";
const debug = logger("db:helpers:generateId");

import { soliditySha3 } from "web3-utils";
const jsonStableStringify = require("json-stable-stringify");

const removeNullyValues = obj =>
  Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ({ [k]: v }))
    .reduce((a, b) => ({ ...a, ...b }), {});

export const generateId = obj => {
  const id = soliditySha3(jsonStableStringify(removeNullyValues(obj)));
  return id;
};
