import {
  base64ToJson,
  connectToMessageBusWithRetries,
  getPorts
} from "./utils/utils";
import { useEffect, useState } from "react";
import { useWeb3React } from '@web3-react/core';
import { Request } from "./utils/types";
import Header from "./components/Header/Header";
import BrowserProvider from "./components/BrowserProvider/BrowserProvider";
import { providers } from "ethers";

function Dashboard() {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [requests, setRequests] = useState<Request[]>([]);
  const { account } = useWeb3React<providers.Web3Provider>();

  // Add warning when trying to close the dashboard
  useEffect(() => {
    window.onbeforeunload = function(e: any) {
      e.returnValue = "";
      return "";
    };
  }, []);

  useEffect(() => {
    const initialiseSocket = async () => {
      if (socket && socket.readyState === WebSocket.OPEN) return;

      const { messageBusListenPort } = await getPorts();
      const connectedSocket = await connectToMessageBusWithRetries(
        messageBusListenPort
      );

      connectedSocket.addEventListener(
        "message",
        (event: MessageEvent) => {
          if (typeof event.data !== "string") return;
          const incomingRequest = base64ToJson(event.data);

          // We're only set up currently to handle browser-provider requests
          if (incomingRequest.type !== "browser-provider") return;

          setRequests((previousRequests) => [...previousRequests, incomingRequest]);
        }
      );

      setSocket(connectedSocket);
    };

    // Initialise socket once after web3 is already initialised
    if (!socket && !!account) initialiseSocket();
  }, [socket, account]);


  return (
    <div className="h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header />
      <BrowserProvider
        socket={socket}
        requests={requests}
        setRequests={setRequests}
      />
    </div>
  );
}

export default Dashboard;
