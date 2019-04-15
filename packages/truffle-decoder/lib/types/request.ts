import BN from "bn.js";

export type DecoderRequest = StorageRequest; //will add more later

export interface StorageRequest {
  type: "storage";
  slot: BN; //will add more fields as needed
}

export function isStorageRequest(request: DecoderRequest): request is StorageRequest {
  return request.type === "storage";
}
