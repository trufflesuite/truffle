import WebSocket from "isomorphic-ws";
import {
  DashboardProviderMessage,
  connectToMessageBusWithRetries,
  isDashboardProviderMessage,
  isInvalidateMessage,
  isDebugMessage,
  Message,
  base64ToJson,
  sendAndAwait,
  createMessage
} from "@truffle/dashboard-message-bus";
import { useEffect, useState } from "react";
import { getPorts, postRpc, respond } from "./utils/utils";
import Header from "./components/Header/Header";
import DashboardProvider from "./components/DashboardProvider/DashboardProvider";
import ConnectNetwork from "./components/ConnectNetwork";
import ConfirmNetworkChanged from "./components/ConfirmNetworkChange";
import { useAccount, useConnect, useNetwork } from "wagmi";

function Dashboard() {
  const [paused, setPaused] = useState<boolean>(false);
  const [connectedChainId, setConnectedChainId] = useState<
    number | undefined
  >();
  const [chainId, setChainId] = useState<number>();
  const [subscribeSocket, setSubscribeSocket] = useState<
    WebSocket | undefined
  >();
  const [publishSocket, setPublishSocket] = useState<WebSocket | undefined>();
  const [dashboardProviderRequests, setDashboardProviderRequests] = useState<
    DashboardProviderMessage[]
  >([]);
  const [dashboardChains, setDashboardChains] = useState<object[]>([]);

  const [{ data }] = useNetwork();
  const [{}, disconnect] = useAccount();
  const [{ data: connectData }] = useConnect();

  useEffect(() => {
    setChainId(data.chain?.id);
    if (!chainId || !subscribeSocket) return;

    if (connectedChainId) {
      if (connectedChainId !== chainId) setPaused(true);
      if (connectedChainId === chainId) setPaused(false);
    } else {
      setConnectedChainId(chainId);
    }
  }, [data, connectData, subscribeSocket, chainId, connectedChainId]);

  const initializeSockets = async () => {
    await Promise.all([initializeSubSocket(), initializePubSocket()]);
  };

  const initializeSubSocket = async () => {
    if (subscribeSocket && subscribeSocket.readyState === WebSocket.OPEN)
      return;

    const { subscribePort } = await getPorts();
    const messageBusHost = window.location.hostname;
    const socket = await connectToMessageBusWithRetries(
      subscribePort,
      messageBusHost
    );

    socket.addEventListener("message", (event: WebSocket.MessageEvent) => {
      if (typeof event.data !== "string") {
        event.data = event.data.toString();
      }

      const message = base64ToJson(event.data) as Message;

      if (isDashboardProviderMessage(message)) {
        setDashboardProviderRequests(previousRequests => [
          ...previousRequests,
          message
        ]);
      } else if (isInvalidateMessage(message)) {
        setDashboardProviderRequests(previousRequests =>
          previousRequests.filter(request => request.id !== message.payload)
        );
      } else if (isDebugMessage(message)) {
        const { payload } = message;
        console.log(payload.message);
        respond({ id: message.id }, socket);
      }
    });

    socket.send("ready");

    setSubscribeSocket(socket);
  };

  const initializePubSocket = async () => {
    if (publishSocket && publishSocket.readyState === WebSocket.OPEN) return;

    const { publishPort } = await getPorts();
    const messageBusHost = window.location.hostname;
    const socket = await connectToMessageBusWithRetries(
      publishPort,
      messageBusHost
    );

    // since our socket is open, request some initial data from the server
    const message = createMessage("initialize", ""); // no payload needed
    const response = await sendAndAwait(socket, message);
    fixDashboardChains(response.payload.dashboardChains);

    setPublishSocket(socket);
  };

  /**
   * Attempts to set the chainId for all chains that don't have one by
   * requesting `eth_chainId` from the RPC url.
   * @param chains
   */
  const fixDashboardChains = async (chains: any[]) => {
    const errors = [];
    for (const chain of chains) {
      if (!chain.chainId) {
        chain.chainId = await postRpc(chain.rpcUrls[0], "eth_chainId");
        if (!chain.chainId) {
          errors.push(
            `Failed to find a chainId for chain ${chain.chainName}. Provide a chainId in the truffle-config, or ensure that the RPC URL is valid.`
          );
        }
      }
    }
    if (errors.length > 0) {
      console.group("Failed to set chainId(s).");
      errors.forEach(error => {
        console.warn(error);
      });
      console.groupEnd();
    }
    setDashboardChains(chains);
  };

  const disconnectAccount = () => {
    console.log("Disconnecting:");
    // turn everything off.
    disconnect();
    setConnectedChainId(undefined);
    setPaused(false);
    subscribeSocket?.close();
    setSubscribeSocket(undefined);
    publishSocket?.close();
    setPublishSocket(undefined);
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header
        disconnect={disconnectAccount}
        dashboardChains={dashboardChains}
      />
      {paused && chainId && connectedChainId && (
        <ConfirmNetworkChanged
          newChainId={chainId}
          previousChainId={connectedChainId}
          confirm={() => setConnectedChainId(chainId)}
        />
      )}
      {!paused && !subscribeSocket && (
        <ConnectNetwork confirm={initializeSockets} />
      )}
      {!paused && subscribeSocket && (
        <DashboardProvider
          paused={paused}
          socket={subscribeSocket}
          requests={dashboardProviderRequests}
          setRequests={setDashboardProviderRequests}
        />
      )}
    </div>
  );
}

export default Dashboard;
