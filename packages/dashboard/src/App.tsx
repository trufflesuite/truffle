import { base64ToJson, connectToServerWithRetries, getPorts, jsonToBase64 } from "./utils";
import { useEffect, useState } from 'react';
import Web3Modal from "web3modal";
import './App.css';
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { Request } from "./types";

function App() {
  const [socket, setSocket] = useState<WebSocket>();
  const [provider, setProvider] = useState<any>();
  const [requests, setRequests] = useState<Request[]>([]);
  const web3modal = new Web3Modal();

  useEffect(() => {
    const initialiseSocket = async () => {
      if (socket && socket.readyState === WebSocket.OPEN) return;

      const { dashboardToBrowserProviderPort } = await getPorts();
      const connectedSocket = await connectToServerWithRetries(dashboardToBrowserProviderPort);

      connectedSocket.addEventListener("message", async (event: MessageEvent) => {
        if (typeof event.data !== "string") return;
        const request = base64ToJson(event.data);
        setRequests(requests => [...requests, request]);
      });

      setSocket(connectedSocket);
    };

    // Initialise socket once after the provider is already initialised
    if (!socket && !!provider) initialiseSocket();
  }, [socket, provider]);

  const removeFromRequests = (id: number) => {
    const newRequests = requests.filter(request => request.id !== id);
    setRequests(() => newRequests);
  };

  const connectWeb3 = async () => {
    const provider = await web3modal.connect();
    setProvider(provider);
  };

  const handleRequest = async (request: Request) => {
    if (!socket) return;
    console.log(requests);

    const responsePayload = await forwardRpcCallToWeb3(request.payload);

    const response = {
      id: request.id,
      payload: responsePayload
    };

    const encodedResponse = jsonToBase64(response);

    socket.send(encodedResponse);

    removeFromRequests(request.id);
  };

  const forwardRpcCallToWeb3 = async (payload: JSONRPCRequestPayload) => {
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

  return (
    <div className="App">
      {!provider && <button onClick={() => connectWeb3()}>Connect Web3</button>}
      {requests.map((request, i) => {
        return (
          <div key={i}>
            <div>
              <div>
                Method: {request.payload.method}
              </div>
              <div>
                Parameters: {JSON.stringify(request.payload.params)}
              </div>
            </div>
            <button onClick={() => handleRequest(request)}>process</button>
          </div>
        );
      })}
    </div>
  );
}

export default App;
