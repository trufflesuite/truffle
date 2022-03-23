import {
  base64ToJson,
  connectToMessageBusWithRetries,
  DashboardProviderMessage,
  isDashboardProviderMessage,
  isDebugMessage,
  isInvalidateMessage,
  isInitializeMessage,
  Message
} from "@truffle/dashboard-message-bus";
import WebSocket from "isomorphic-ws";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useNetwork } from "wagmi";
import ConfirmNetworkChanged from "./components/ConfirmNetworkChange";
import { getPorts, respond } from "./utils/utils";
import Header from "./components/header/Header";
import DashboardProvider from "./components/dashboardprovider";
import ConnectNetwork from "./components/ConnectNetwork";

function Dashboard() {
  const [paused, setPaused] = useState<boolean>(false);
  const [connectedChainId, setConnectedChainId] = useState<
    number | undefined
  >();
  const [chainId, setChainId] = useState<number>();
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [dashboardProviderRequests, setDashboardProviderRequests] = useState<
    DashboardProviderMessage[]
  >([]);
  const [publicChains, setPublicChains] = useState<object[]>([]);

  const [{ data }] = useNetwork();
  const [{}, disconnect] = useAccount();
  const [{ data: connectData }] = useConnect();

  useEffect(() => {
    setChainId(data.chain?.id);

    if (!chainId || !socket) return;
    if (connectedChainId) {
      if (connectedChainId !== chainId) setPaused(true);
      if (connectedChainId === chainId) setPaused(false);
    } else {
      setConnectedChainId(chainId);
    }
  }, [data, connectData, socket, chainId, connectedChainId]);

  const initializeSocket = async () => {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    const messageBusHost = window.location.hostname;
    const { subscribePort } = await getPorts();
    const connectedSocket = await connectToMessageBusWithRetries(
      subscribePort,
      messageBusHost
    );

    connectedSocket.addEventListener(
      "message",
      (event: WebSocket.MessageEvent) => {
        if (typeof event.data !== "string") {
          event.data = event.data.toString();
        }

        const message = base64ToJson(event.data) as Message;

        console.debug("Received message", message);

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
          respond({ id: message.id }, connectedSocket);
        } else if (isInitializeMessage(message)) {
          setPublicChains(message.payload.publicChains);
        }
      }
    );

    connectedSocket.send("ready");

    setSocket(connectedSocket);
  };

  const disconnectAccount = () => {
    console.log("Disconnecting:");
    // turn everything off.
    disconnect();
    setConnectedChainId(undefined);
    setPaused(false);
    socket?.close();
    setSocket(undefined);
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header disconnect={disconnectAccount} publicChains={publicChains} />
      {paused && chainId && connectedChainId && (
        <ConfirmNetworkChanged
          newChainId={chainId}
          previousChainId={connectedChainId}
          confirm={() => setConnectedChainId(chainId)}
        />
      )}
      {!paused && !socket && <ConnectNetwork confirm={initializeSocket} />}
      {!paused && socket && (
        <DashboardProvider
          paused={paused}
          socket={socket}
          requests={dashboardProviderRequests}
          setRequests={setDashboardProviderRequests}
        />
      )}
    </div>
  );
}

export default Dashboard;
