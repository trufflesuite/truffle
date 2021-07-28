import { jsonToBase64 } from "../utils/utils";
import { useEffect, useState } from 'react';
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import { Request } from "../utils/types";
import { NON_INTERACTIVE_REQUESTS } from "src/utils/constants";

interface Props {
  requests: Request[];
  setRequests: (requests: Request[] | (() => Request[])) => void;
  provider?: any;
  socket?: WebSocket;
}

function BrowserProvider({ provider, socket, requests, setRequests }: Props) {
  const [interactiveRequests, setInteractiveRequests] = useState<Request[]>([]);

  useEffect(() => {
    const interactive = requests.filter((request) => !NON_INTERACTIVE_REQUESTS.includes(request.payload.method));
    const nonInteractive = requests.filter((request) => NON_INTERACTIVE_REQUESTS.includes(request.payload.method));

    nonInteractive.forEach(handleRequest);
    setInteractiveRequests(interactive);
  }, [requests]);

  const removeFromRequests = (id: number) => {
    const newRequests = requests.filter(request => request.id !== id);
    setRequests(() => newRequests);
  };

  const handleRequest = async (request: Request) => {
    if (!socket || !provider) return;

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
    <div className="flex justify-center items-center">
      <div className="border-black border-2 p-2 mt-20">
        <h2 className="text-center">Incoming Requests</h2>
        <div className="mt-2">
          {interactiveRequests.map((request, i) => {
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
