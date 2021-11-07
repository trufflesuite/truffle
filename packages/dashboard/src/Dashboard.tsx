import WebSocket from "isomorphic-ws";
import {
  BrowserProviderMessage,
  connectToMessageBusWithRetries,
  isBrowserProviderMessage,
  isInvalidateMessage,
  Message
} from "@truffle/dashboard-message-bus";
import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { base64ToJson, getPorts } from "./utils/utils";
import Header from "./components/Header/Header";
import BrowserProvider from "./components/BrowserProvider/BrowserProvider";
import ConnectNetwork from "./components/ConnectNetwork";
import ConfirmNetworkChanged from "./components/ConfirmNetworkChange";

function Dashboard() {
  const [paused, setPaused] = useState<boolean>(false);
  const [connectedChainId, setConnectedChainId] = useState<number>();
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [browserProviderRequests, setBrowserProviderRequests] = useState<
    BrowserProviderMessage[]
  >([]);

  const { chainId } = useWeb3React();

  useEffect(() => {
    if (!chainId || !socket) return;

    if (connectedChainId) {
      if (connectedChainId !== chainId) setPaused(true);
      if (connectedChainId === chainId) setPaused(false);
    } else {
      setConnectedChainId(chainId);
    }

  }, [chainId, connectedChainId, socket]);

  const initializeSocket = async () => {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    const messageBusHost = window.location.hostname;
    const { messageBusListenPort } = await getPorts();
    const connectedSocket = await connectToMessageBusWithRetries(
      messageBusListenPort,
      messageBusHost
    );

    connectedSocket.addEventListener(
      "message",
      (event: WebSocket.MessageEvent) => {
        if (typeof event.data !== "string") return;
        const message = base64ToJson(event.data) as Message;

        console.debug("Received message", message);

        if (isBrowserProviderMessage(message)) {
          setBrowserProviderRequests(previousRequests => [
            ...previousRequests,
            message
          ]);
        } else if (isInvalidateMessage(message)) {
          setBrowserProviderRequests(previousRequests =>
            previousRequests.filter(request => request.id !== message.payload)
          );
        }
      }
    );

    setSocket(connectedSocket);
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header />
      {paused && chainId && connectedChainId && (
        <ConfirmNetworkChanged
          newChainId={chainId}
          previousChainId={connectedChainId}
          confirm={() => setConnectedChainId(chainId)}
        />
      )}
      {!paused && !socket && <ConnectNetwork confirm={initializeSocket} />}
      {!paused && socket && (
        <BrowserProvider
          paused={paused}
          socket={socket}
          requests={browserProviderRequests}
          setRequests={setBrowserProviderRequests}
        />
      )}
    </div>
  );
}

export default Dashboard;
