import web3Utils from "web3-utils";

import { AllowedTxParams } from "./types";

// TODO BGC Export this methods for @truffle/contract
export function isObject(val: any) {
  return typeof val === "object" && !Array.isArray(val);
}

export function isBigNumber(val: any) {
  if (typeof val !== "object") return false;

  //NOTE: For some reason, contrary to the docs,
  //web3Utils.isBigNumber returns true not only for
  //bignumber.js BigNumbers, but also for ethers BigNumbers,
  //even though these are totally different things.
  return web3Utils.isBN(val) || web3Utils.isBigNumber(val);
}

export function isTxParams(val: any) {
  if (!isObject(val)) return false;
  if (isBigNumber(val)) return false;
  return Object.keys(val).some(fieldName => Object.keys(AllowedTxParams).includes(fieldName));
}