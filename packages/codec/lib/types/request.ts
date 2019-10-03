import BN from "bn.js";

export type DecoderRequest = StorageRequest | CodeRequest;

export interface StorageRequest {
  type: "storage";
  slot: BN; //will add more fields as needed
}

export interface CodeRequest {
  type: "code";
  address: string;
}
