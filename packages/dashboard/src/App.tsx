import {
  base64ToJson,
  connectToServerWithRetries,
  getPorts
} from "./utils/utils";
import { useEffect, useState } from "react";
import Web3Modal from "web3modal";
import { Request } from "./utils/types";
import Header from "./components/Header";
import BrowserProvider from "./components/BrowserProvider";

function App() {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [provider, setProvider] = useState<any>();
  const [requests, setRequests] = useState<Request[]>([]);
  const web3modal = new Web3Modal();

  useEffect(() => {
    const initialiseSocket = async () => {
      if (socket && socket.readyState === WebSocket.OPEN) return;

      const { dashboardToMessageBusPort } = await getPorts();
      const connectedSocket = await connectToServerWithRetries(
        dashboardToMessageBusPort
      );

      connectedSocket.addEventListener(
        "message",
        async (event: MessageEvent) => {
          if (typeof event.data !== "string") return;
          const request = base64ToJson(event.data);
          setRequests(requests => [...requests, request]);
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
    <div>
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
