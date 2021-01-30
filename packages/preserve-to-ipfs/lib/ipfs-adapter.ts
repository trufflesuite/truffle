import * as Preserve from "@truffle/preserve";
import createIpfsHttpClient from "ipfs-http-client";

// extract the typing for an IIPFS client from the default export of "ipfs-http-client"
// since the actual type is not exported
export type IpfsClient = ReturnType<typeof createIpfsHttpClient>;

// Define an interface for a "FileObject", which gets uploaded to IPFS
export interface FileObject {
  path: string;
  content: Preserve.Targets.Normalized.Sources.Content;
}

// Extract the result interface of the IpfsClient::addAll method
export type IpfsAddAllResults = ReturnType<IpfsClient["addAll"]>;

// Define an interface for the result of the IpfsClient::get method
export interface IpfsGetResult {
  path: string;
  content?: AsyncIterable<Uint8Array>;
}

export type IpfsGetResults = AsyncIterable<IpfsGetResult>;
