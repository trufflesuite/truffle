import WebSocket from "isomorphic-ws";
import {
  BrowserProviderMessage,
  getMessageBusPorts,
  PortsConfig
} from "@truffle/dashboard-message-bus";
import axios from "axios";
import { providers } from "ethers";
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { INTERACTIVE_REQUESTS, UNSUPPORTED_REQUESTS } from "./constants";

export const jsonToBase64 = (json: any) => {
  const stringifiedJson = JSON.stringify(json);
  const buffer = Buffer.from(stringifiedJson);
  const base64 = buffer.toString("base64");

  return base64;
};

export const base64ToJson = (base64: string) => {
  const buffer = Buffer.from(base64, "base64");
  const stringifiedJson = buffer.toString("utf8");
  const json = JSON.parse(stringifiedJson);

  return json;
};

export const getPorts = async (): Promise<PortsConfig> => {
  const dashboardHost = window.location.hostname;
  const dashboardPort =
    process.env.NODE_ENV === "development"
      ? 5000
      : Number(window.location.port);
  return getMessageBusPorts(dashboardPort, dashboardHost);
};

export const isInteractiveRequest = (request: BrowserProviderMessage) =>
  INTERACTIVE_REQUESTS.includes(request.payload.method);

export const isUnsupportedRequest = (request: BrowserProviderMessage) =>
  UNSUPPORTED_REQUESTS.includes(request.payload.method);

export const forwardBrowserProviderRequest = async (
  provider: any,
  payload: JSONRPCRequestPayload
) => {
  const sendAsync = promisify(provider.sendAsync.bind(provider));
  try {
    const response = await sendAsync(payload);
    return response;
  } catch (error) {
    return {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      error
    };
  }
};

export const handleBrowserProviderRequest = async (
  request: BrowserProviderMessage,
  provider: any,
  responseSocket: WebSocket
) => {
  const responsePayload = await forwardBrowserProviderRequest(
    provider,
    request.payload
  );
  const response = {
    id: request.id,
    payload: responsePayload
  };

  respond(response, responseSocket);
};

export const respondToUnsupportedRequest = (
  request: BrowserProviderMessage,
  responseSocket: WebSocket
) => {
  const errorResponse = {
    id: request.id,
    payload: {
      jsonrpc: request.payload.jsonrpc,
      id: request.payload.id,
      error: {
        code: 4001,
        message: `Method "${request.payload.method}" is unsupported by @truffle/browser-provider`
      }
    }
  };

  respond(errorResponse, responseSocket);
};

export const respond = (response: any, socket: WebSocket) => {
  console.debug("Sending response", response);
  const encodedResponse = jsonToBase64(response);
  socket.send(encodedResponse);
};

export const getLibrary = (provider: any) =>
  new providers.Web3Provider(provider);

export const getNetworkName = async (chainId: number) => {
  const { data: chainList } = await axios.get(
    "https://chainid.network/chains.json"
  );
  const [chain] = chainList.filter((chain: any) => chain.chainId === chainId);
  if (!chain) return `CHAIN ID ${chainId}`;
  return chain.name.toUpperCase();
};

export const getDisplayName = async (
  library: providers.Web3Provider,
  address: string
) => {
  const ensName = await reverseLookup(library, address);
  const shortenedAccount = shortenAddress(address);
  const displayName = (ensName ?? shortenedAccount).toUpperCase();
  return displayName;
};

export const reverseLookup = async (
  library: providers.Web3Provider,
  address: string
) => {
  try {
    return await library.lookupAddress(address);
  } catch {
    return undefined;
  }
};

export const shortenAddress = (address: string) => {
  return `${address.substr(0, 6)}...${address.substr(address.length - 4, 4)}`;
};
