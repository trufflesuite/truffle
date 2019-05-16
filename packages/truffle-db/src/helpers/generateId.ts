import { soliditySha3 } from "web3-utils";
const jsonStableStringify = require('json-stable-stringify');

export const generateId = (obj) => soliditySha3(jsonStableStringify(obj));
