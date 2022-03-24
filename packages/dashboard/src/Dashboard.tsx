import {
  base64ToJson,
  connectToMessageBusWithRetries,
  DashboardProviderMessage,
  isDashboardProviderMessage,
  isDebugMessage,
  isInvalidateMessage,
  Message,
  sendAndAwait,
  createMessage
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
    setDashboardChains(response.payload.dashboardChains);

    setPublishSocket(socket);
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header disconnect={disconnect} dashboardChains={dashboardChains} />
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
