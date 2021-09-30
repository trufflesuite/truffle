import WebSocket from "isomorphic-ws";
import { BrowserProviderMessage, connectToMessageBusWithRetries } from "@truffle/dashboard-message-bus";
import { base64ToJson, getPorts } from "./utils/utils";
import { useEffect, useState } from "react";
import { useWeb3React } from '@web3-react/core';
import Header from "./components/Header/Header";
import BrowserProvider from "./components/BrowserProvider/BrowserProvider";
import { providers } from "ethers";

function Dashboard() {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [browserProviderRequests, setBrowserProviderRequests] = useState<BrowserProviderMessage[]>([]);
  const { account } = useWeb3React<providers.Web3Provider>();

  useEffect(() => {
    const initialiseSocket = async () => {
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
          const incomingRequest = base64ToJson(event.data);

          // We're only set up currently to handle browser-provider requests
          if (incomingRequest.type !== "browser-provider") return;

          setBrowserProviderRequests((previousRequests) => [...previousRequests, incomingRequest]);
        }
      );

      setSocket(connectedSocket);
    };

    // Initialise socket once after web3 is already initialised
    if (!socket && !!account) initialiseSocket();
  }, [socket, account]);


  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header />
      <BrowserProvider
        socket={socket}
        requests={browserProviderRequests}
        setRequests={setBrowserProviderRequests}
      />
    </div>
  );
}

export default Dashboard;
