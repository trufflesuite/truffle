import { isInteractiveRequest, jsonToBase64 } from "../utils/utils";
import { useEffect } from 'react';
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { Request } from "../utils/types";

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

  return (
    <div className="flex justify-center items-center">
      <div className="border-black border-2 p-2 mt-20">
        <h2 className="text-center">Incoming Requests</h2>
        <div className="mt-2">
          {requests.filter(isInteractiveRequest).map((request, i) => {
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
      </div>
    </div>
  );
}

export default BrowserProvider;
