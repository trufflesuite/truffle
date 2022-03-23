import WebSocket from "isomorphic-ws";
import {
  DashboardProviderMessage,
  connectToMessageBusWithRetries,
  isDashboardProviderMessage,
  isInvalidateMessage,
  isDebugMessage,
  Message,
  base64ToJson,
  LogMessage,
  sendAndAwait,
  createMessage,
  jsonToBase64,
  isLogMessage
} from "@truffle/dashboard-message-bus";
import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { getPorts, respond } from "./utils/utils";
import Header from "./components/Header/Header";
import DashboardProvider from "./components/DashboardProvider/DashboardProvider";
import ConnectNetwork from "./components/ConnectNetwork";
import ConfirmNetworkChanged from "./components/ConfirmNetworkChange";

function Dashboard() {
  const [paused, setPaused] = useState<boolean>(false);
  const [connectedChainId, setConnectedChainId] = useState<number>();
  const [subscribeSocket, setSubscribeSocket] = useState<
    WebSocket | undefined
  >();
  const [publishSocket, setPublishSocket] = useState<WebSocket | undefined>();
  const [dashboardProviderRequests, setDashboardProviderRequests] = useState<
    DashboardProviderMessage[]
  >([]);
  const [publicChains, setPublicChains] = useState<object[]>([]);

  const { chainId } = useWeb3React();

  useEffect(() => {
    if (!chainId || !subscribeSocket) return;

    if (connectedChainId) {
      if (connectedChainId !== chainId) setPaused(true);
      if (connectedChainId === chainId) setPaused(false);
    } else {
      setConnectedChainId(chainId);
    }
  }, [chainId, connectedChainId, subscribeSocket]);

  const initializeSockets = async () => {
    await initializeSubSocket();
    await initializePubSocket();
  };

  const initializeSubSocket = async () => {
    if (subscribeSocket && subscribeSocket.readyState === WebSocket.OPEN)
      return;

    const { subscribePort } = await getPorts();
    const socket = await initializeSocket(
      subscribePort,
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
          respond({ id: message.id }, socket);
        }
      }
    );
    socket.send("ready");

    setSubscribeSocket(socket);
  };

  const initializePubSocket = async () => {
    if (publishSocket && publishSocket.readyState === WebSocket.OPEN) return;

    const { publishPort } = await getPorts();
    const socket = await initializeSocket(
      publishPort,
      (event: WebSocket.MessageEvent) => {
        if (typeof event.data !== "string") {
          event.data = event.data.toString();
        }

        const message = base64ToJson(event.data);
        if (isLogMessage(message)) {
          const logMessage = message as LogMessage;
          console.log(
            logMessage.payload.namespace +
              ": " +
              JSON.stringify(logMessage.payload.message)
          );
        }
      }
    );

    const message = createMessage("initialize", jsonToBase64({}));
    const response = await sendAndAwait(socket, message);
    if (response.payload.error) {
      console.log("error on initialization: " + JSON.stringify(response));
    } else {
      setPublicChains(response.payload.publicChains);
    }
    setPublishSocket(socket);
  };

  const initializeSocket = async (
    port: number,
    messageEventHandler: (event: WebSocket.MessageEvent) => void
  ) => {
    const messageBusHost = window.location.hostname;
    const connectedSocket = await connectToMessageBusWithRetries(
      port,
      messageBusHost
    );

    connectedSocket.addEventListener("message", messageEventHandler);

    return connectedSocket;
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header publicChains={publicChains} />
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
