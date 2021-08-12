import { handleBrowserProviderRequest, isInteractiveRequest } from "../../utils/utils";
import { useEffect } from 'react';
import { Request } from "../../utils/types";
import Card from "../common/Card";
import IncomingRequest from "./IncomingRequest";

interface Props {
  requests: Request[];
  setRequests: (requests: Request[] | ((requests: Request[]) => Request[])) => void;
  provider?: any;
  socket?: WebSocket;
}

function BrowserProvider({ provider, socket, requests, setRequests }: Props) {
  useEffect(() => {
    const removeFromRequests = (id: number) => {
      setRequests((previousRequests) => previousRequests.filter(request => request.id !== id));
    };

    if (!provider || !socket) return;

    // Automatically handle all non-interactive requests
    requests
      .filter((request) => !isInteractiveRequest(request))
      .forEach(async (request) => {
        handleBrowserProviderRequest(request, provider, socket);
        removeFromRequests(request.id);
      });
  }, [requests, setRequests, provider, socket]);

  const incomingRequests = provider && socket
    ? requests.filter(isInteractiveRequest).map((request) => (
        <IncomingRequest
          request={request}
          setRequests={setRequests}
          provider={provider}
          socket={socket}
        />
      ))
    : [];

  return (
    <div className="flex justify-center items-center mt-20">
      <div className="mx-3 w-3/4 max-w-4xl h-2/3">
        <Card header="INCOMING REQUESTS" body={incomingRequests}/>
      </div>
    </div>
  );
}

export default BrowserProvider;
