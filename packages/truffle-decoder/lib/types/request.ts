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

export function isStorageRequest(request: DecoderRequest): request is StorageRequest {
  return request.type === "storage";
}

export function isCodeRequest(request: DecoderRequest): request is CodeRequest {
  return request.type === "code";
}
