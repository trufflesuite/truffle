import { HttpProvider } from "web3-providers-http";
import { IpcProvider } from "web3-providers-ipc";
import { WebsocketProvider } from "web3-providers-ws";

export type Provider = HttpProvider | IpcProvider | WebsocketProvider;

export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: string;
}

export interface Callback<ResultType> {
  (error: Error): void;
  (error: null, val: ResultType): void;
}
