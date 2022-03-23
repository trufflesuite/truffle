import WebSocket from "isomorphic-ws";
import {
  DashboardProviderMessage,
  getMessageBusPorts,
  jsonToBase64,
  PortsConfig
} from "@truffle/dashboard-message-bus";
import axios from "axios";
import { providers } from "ethers";
import type { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { INTERACTIVE_REQUESTS, UNSUPPORTED_REQUESTS } from "./constants";

export const getPorts = async (): Promise<PortsConfig> => {
  const dashboardHost = window.location.hostname;
  const dashboardPort =
    process.env.NODE_ENV === "development"
      ? 24012
      : Number(window.location.port);
  return getMessageBusPorts(dashboardPort, dashboardHost);
};

export const isInteractiveRequest = (request: DashboardProviderMessage) =>
  INTERACTIVE_REQUESTS.includes(request.payload.method);

export const isUnsupportedRequest = (request: DashboardProviderMessage) =>
  UNSUPPORTED_REQUESTS.includes(request.payload.method);

export const forwardDashboardProviderRequest = async (
  provider: any,
  connector: any,
  payload: JSONRPCRequestPayload
) => {
  console.log("forwardDashboardProviderRequest:input", {
    id: payload.id,
    provider,
    connector,
    payload
  });
  const sendAsync = promisify(provider.sendAsync.bind(provider));
  try {
    let result = await sendAsync(payload);
    let connectorId: string | undefined = connector?.id;
    console.log("forwardDashboardProviderRequest:result", {
      id: payload.id,
      payload,
      result
    });
    if (connectorId === "injected") {
      // we should get full RPC json payloads returned.
      return result;
    } else {
      // we may just get the result object itself, no RPC wrapper.
      return {
        jsonrpc: payload.jsonrpc,
        id: payload.id,
        result
      };
    }
  } catch (error) {
    console.error(error);
    return {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      error
    };
  }
};

export const handleDashboardProviderRequest = async (
  request: DashboardProviderMessage,
  provider: any,
  connector: any,
  responseSocket: WebSocket
) => {
  console.log("handleDashboardProviderRequest:input", {
    request,
    provider,
    connector
  });
  const responsePayload = await forwardDashboardProviderRequest(
    provider,
    connector,
    request.payload
  );
  const response = {
    id: request.id,
    payload: responsePayload
  };
  console.log("handleDashboardProviderRequest:responding", {
    request,
    response
  });
  respond(response, responseSocket);
};

export const respondToUnsupportedRequest = (
  request: DashboardProviderMessage,
  responseSocket: WebSocket
) => {
  const defaultMessage = `Method "${request.payload.method}" is unsupported by @truffle/dashboard`;
  const customMessages: { [index: string]: string } = {
    eth_sign:
      'Method "eth_sign" is unsupported by @truffle/dashboard, please use "personal_sign" instead'
  };

  const message = customMessages[request.payload.method] ?? defaultMessage;
  const code = 4001;

  const errorResponse = {
    id: request.id,
    payload: {
      jsonrpc: request.payload.jsonrpc,
      id: request.payload.id,
      error: { code, message }
    }
  };

  respond(errorResponse, responseSocket);
};

export const respond = (response: any, socket: WebSocket) => {
  console.debug("Sending response", response);
  const encodedResponse = jsonToBase64(response);
  socket.send(encodedResponse);
};

export const getNetworkName = async (chainId: number) => {
  const { data: chainList } = await axios.get(
    "https://chainid.network/chains.json"
  );
  const [chain] = chainList.filter((chain: any) => chain.chainId === chainId);
  if (!chain) return `Chain ID ${chainId}`;
  return chain.name;
};

export const getDisplayName = async (
  provider: providers.BaseProvider,
  address: string
) => {
  const ensName = await reverseLookup(provider, address);
  const shortenedAccount = shortenAddress(address);
  return ensName ?? shortenedAccount;
};

export const reverseLookup = async (
  provider: providers.BaseProvider,
  address: string
) => {
  try {
    return await provider.lookupAddress(address);
  } catch {
    return undefined;
  }
};

export const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
