import {
  Provider,
  JSONRPCRequestPayload,
  JSONRPCErrorCallback
} from "ethereum-protocol";
import { Callback, JsonRpcResponse } from "@truffle/provider";

interface Web3ProviderEngineOptions {
  pollingInterval?: number;
  blockTracker?: any;
  blockTrackerProvider?: any;
}
declare class Web3ProviderEngine implements Provider {
  constructor(options?: Web3ProviderEngineOptions);
  on(event: string, handler: () => void): void;
  send(
    payload: JSONRPCRequestPayload,
    callback?: JSONRPCErrorCallback | Callback<JsonRpcResponse>
  ): void;
  sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRpcResponse>
  ): void;
  addProvider(provider: any): void;
  // start block polling
  start(callback?: () => void): void;
  // stop block polling
  stop(): void;
}
export default Web3ProviderEngine;

declare module "web3-provider-engine/subproviders/provider";
declare module "web3-provider-engine/subproviders/hooked-wallet";
declare module "web3-provider-engine/subproviders/nonce-tracker";
declare module "web3-provider-engine/subproviders/filters";
