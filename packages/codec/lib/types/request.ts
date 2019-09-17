import BN from "bn.js";
import { Values } from "truffle-codec-utils";
import { ContractInfoAndContext } from "./decoding";

export type DecoderRequest = StorageRequest | CodeRequest;

export interface StorageRequest {
  type: "storage";
  slot: BN; //will add more fields as needed
}

export interface CodeRequest {
  type: "code";
  address: string;
}
