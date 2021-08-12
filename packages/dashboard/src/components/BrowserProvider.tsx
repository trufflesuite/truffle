import { isInteractiveRequest, jsonToBase64 } from "../utils/utils";
import { useEffect } from 'react';
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { Request } from "../utils/types";
import Button from "./Button";
import Card from "./Card";

interface Props {
  requests: Request[];
  setRequests: (requests: Request[] | ((requests: Request[]) => Request[])) => void;
  provider?: any;
  socket?: WebSocket;
}

function BrowserProvider({ provider, socket, requests, setRequests }: Props) {
  useEffect(() => {
    // Automatically handle all non-interactive requests
    requests
      .filter((request) => !isInteractiveRequest(request))
      .forEach(handleRequest);
  }, [requests]);

  const removeFromRequests = (id: number) => {
    setRequests((previousRequests) => previousRequests.filter(request => request.id !== id));
  };

  const handleRequest = async (request: Request) => {
    if (!socket || !provider) return;
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
      const response = await sendAsync(payload);
      return response;
    } catch (error) {
      return {
        jsonrpc: payload.jsonrpc,
        id: payload.id,
        error
      };
    }
  };

  const cardContent = requests.filter(isInteractiveRequest).map((request, i) => {
      return (
        <div key={i} className="flex justify-center items-center">
          <Card
            header={request.payload.method}
            body={
              <div>
                {JSON.stringify(request.payload.params)}
              </div>
            }
            footer={
              <div className="flex justify-center items-center">
                <Button onClick={() => handleRequest(request)} text="PROCESS" />
              </div>
            }
          />
        </div>
      );
    });

  return (
    <div className="flex justify-center items-center mt-20">
      <Card header="INCOMING REQUESTS" body={cardContent}/>
    </div>
  );
}

export default BrowserProvider;
