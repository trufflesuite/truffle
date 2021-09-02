import {
  base64ToJson,
  connectToMessageBusWithRetries,
  getPorts
} from "./utils/utils";
import { useEffect, useState } from "react";
import Web3Modal from "web3modal";
import { Request } from "./utils/types";
import Header from "./components/Header/Header";
import BrowserProvider from "./components/BrowserProvider/BrowserProvider";

function App() {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [provider, setProvider] = useState<any>();
  const [requests, setRequests] = useState<Request[]>([]);
  const web3modal = new Web3Modal();

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

    // Initialise socket once after the provider is already initialised
    if (!socket && !!provider) initialiseSocket();
  }, [socket, provider]);

  const connectWeb3 = async () => {
    const provider = await web3modal.connect();
    setProvider(provider);
  };

  return (
    <div className="h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header provider={provider} connectWeb3={connectWeb3} />
      <BrowserProvider
        provider={provider}
        socket={socket}
        requests={requests}
        setRequests={setRequests}
      />
    </div>
  );
}

export default App;
