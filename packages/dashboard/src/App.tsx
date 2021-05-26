import { base64ToJson, connectToServerWithRetries, jsonToBase64 } from "./utils";
import { useEffect, useState } from 'react';
import Web3Modal from "web3modal";
import './App.css';
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";

function App() {
  const [socket, setSocket] = useState<WebSocket>();
  const [provider, setProvider] = useState<any>();
  const port = 8081;
  const web3modal = new Web3Modal();

  useEffect(() => {
    const initialiseSocket = async () => {
      if (socket && socket.readyState === WebSocket.OPEN) return;
      const connectedSocket = await connectToServerWithRetries(port);

      connectedSocket.addEventListener("message", async (event: MessageEvent) => {
        if (typeof event.data !== "string") return;

        const request = base64ToJson(event.data);

        const responsePayload = await forwardToWeb3(request.payload);

        const response = {
          id: request.id,
          payload: responsePayload
        };

        const encodedResponse = jsonToBase64(response);

        connectedSocket.send(encodedResponse);
      });

      setSocket(connectedSocket);
    };

    const forwardToWeb3 = async (payload: JSONRPCRequestPayload) => {
      const sendAsync = promisify(provider.sendAsync.bind(provider));
      try {
        console.log(payload);
        const response = await sendAsync(payload);
        console.log(response);
        return response;
      } catch (error) {
        return {
          jsonrpc: payload.jsonrpc,
          id: payload.id,
          error
        };
      }
    };

    // Initialise socket once after the provider is already initialised
    if (!socket && !!provider) initialiseSocket();
  }, [socket, provider]);


  const connectWeb3 = async () => {
    const provider = await web3modal.connect();
    setProvider(provider);
  };

  return (
    <div className="App">
      {!provider && <button onClick={() => connectWeb3()}>Connect Web3</button>}
    </div>
  );
}

export default App;
