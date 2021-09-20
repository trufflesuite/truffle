import { getMessageBusPorts, PortsConfig } from "@truffle/dashboard-message-bus";
import axios from "axios";
import delay from "delay";
import { providers } from 'ethers';
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { INTERACTIVE_REQUESTS } from "./constants";
import { BrowserProviderRequest, Request } from "./types";

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

// TODO: Replace these functions with those in the Dashboard Message Bus package
// Only difference rn is that this uses browser WebSocket, while the other uses Node.js WebSocket
export const connectToMessageBusWithRetries = async (port: number, retries = 1, tryCount = 1): Promise<WebSocket> => {
  try {
    return await connectToMessageBus(port);
  } catch (e) {
    if (tryCount === retries) throw e;
    await delay(1000);
    return await connectToMessageBusWithRetries(port, retries, tryCount + 1);
  }
};

export const connectToMessageBus = (port: number, host: string = "localhost") => {
  const socket = new WebSocket(`ws://${host}:${port}`);

  return new Promise<WebSocket>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(socket));
    socket.addEventListener("error", reject);
  });
};

export const getPorts = async (): Promise<PortsConfig> => {
  const dashboardHost = window.location.hostname;
  const dashboardPort = process.env.NODE_ENV === 'development' ? 5000 : Number(window.location.port);
  return getMessageBusPorts(dashboardPort, dashboardHost);
};

export const isInteractiveRequest = (request: BrowserProviderRequest) =>
  INTERACTIVE_REQUESTS.includes(request.payload.method);

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

export const handleBrowserProviderRequest = async (request: Request, provider: any, responseSocket: WebSocket) => {
  const responsePayload = await forwardBrowserProviderRequest(provider, request.payload);
  const response = {
    id: request.id,
    payload: responsePayload
  };
  const encodedResponse = jsonToBase64(response);
  responseSocket.send(encodedResponse);
};

export const getLibrary = (provider: any) => new providers.Web3Provider(provider);

export const getNetworkName = async (chainId: number) => {
  const { data: chainList } = await axios.get('https://chainid.network/chains.json');
  const [chain] = chainList.filter((chain: any) => chain.chainId === chainId);
  if (!chain) return `CHAIN ID ${chainId}`;
  return chain.name.toUpperCase();
};

export const getDisplayName = async (library: providers.Web3Provider, address: string) => {
  const ensName = await reverseLookup(library, address);
  const shortenedAccount = shortenAddress(address);
  const displayName = (ensName ?? shortenedAccount).toUpperCase();
  return displayName;
};

export const reverseLookup = async (library: providers.Web3Provider, address: string) => {
  try {
    return await library.lookupAddress(address);
  } catch {
    return undefined;
  }
};

export const shortenAddress = (address: string) => {
  return `${address.substr(0, 6)}...${address.substr(address.length - 4, 4)}`;
};
