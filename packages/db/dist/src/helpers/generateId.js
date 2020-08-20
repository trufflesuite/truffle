"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = void 0;
const web3_utils_1 = require("web3-utils");
const jsonStableStringify = require("json-stable-stringify");
const removeNullyValues = obj =>
  Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ({ [k]: v }))
    .reduce((a, b) => Object.assign(Object.assign({}, a), b), {});
exports.generateId = obj => {
  const id = web3_utils_1.soliditySha3(
    jsonStableStringify(removeNullyValues(obj))
  );
  return id;
};
//# sourceMappingURL=generateId.js.map
