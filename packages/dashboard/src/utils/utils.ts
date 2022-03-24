import axios from "axios";
import { providers } from "ethers";
import type { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { INTERACTIVE_REQUESTS, UNSUPPORTED_REQUESTS } from "./constants";
import { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";

export const isInteractiveRequest = (
  request: ReceivedMessageLifecycle<DashboardProviderMessage>
) => INTERACTIVE_REQUESTS.includes(request.message.payload.method);

export const isUnsupportedRequest = (
  request: ReceivedMessageLifecycle<DashboardProviderMessage>
) => UNSUPPORTED_REQUESTS.includes(request.message.payload.method);

export const forwardDashboardProviderRequest = async (
  provider: any,
  connector: any,
  payload: JSONRPCRequestPayload
) => {
  console.debug("forwardDashboardProviderRequest:input", {
    id: payload.id,
    provider,
    connector,
    payload
  });
  const sendAsync = promisify(provider.sendAsync.bind(provider));
  try {
    let result = await sendAsync(payload);
    let connectorId: string | undefined = connector?.id;
    console.debug("forwardDashboardProviderRequest:result", {
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
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>,
  provider: any,
  connector: any
) => {
  const payload = await forwardDashboardProviderRequest(
    provider,
    connector,
    lifecycle.message.payload
  );
  return lifecycle.respond({ payload });
};

export const respondToUnsupportedRequest = async (
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
) => {
  const defaultMessage = `Method "${lifecycle.message.payload.method}" is unsupported by @truffle/dashboard-provider`;
  const customMessages: { [index: string]: string } = {
    eth_sign:
      'Method "eth_sign" is unsupported by @truffle/dashboard-provider, please use "personal_sign" instead'
  };

  const message =
    customMessages[lifecycle.message.payload.method] ?? defaultMessage;
  const code = 4001;

  const payload = {
    jsonrpc: lifecycle.message.payload.jsonrpc,
    id: lifecycle.message.payload.id,
    error: { code, message }
  };

  return lifecycle.respond({ payload });
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
