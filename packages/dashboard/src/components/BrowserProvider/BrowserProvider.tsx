import { useEffect } from 'react';
import { useWeb3React } from "@web3-react/core";
import { providers } from "ethers";
import { handleBrowserProviderRequest, isInteractiveRequest } from "../../utils/utils";
import { Request } from "../../utils/types";
import Card from "../common/Card";
import IncomingRequest from "./IncomingRequest";

interface Props {
  requests: Request[];
  setRequests: (requests: Request[] | ((requests: Request[]) => Request[])) => void;
  socket?: WebSocket;
}

function BrowserProvider({ socket, requests, setRequests }: Props) {
  const { account, library } = useWeb3React<providers.Web3Provider>();

  useEffect(() => {
    const removeFromRequests = (id: number) => {
      setRequests((previousRequests) => previousRequests.filter(request => request.id !== id));
    };

    if (!account || !library || !socket) return;

    // Automatically handle all non-interactive requests
    requests
      .filter((request) => !isInteractiveRequest(request))
      .forEach(async (request) => {
        handleBrowserProviderRequest(request, library.provider, socket);
        removeFromRequests(request.id);
      });
  }, [requests, setRequests, socket, account, library]);

  const incomingRequests = account && library && socket
    ? requests.filter(isInteractiveRequest).map((request) => (
        <IncomingRequest
          request={request}
          setRequests={setRequests}
          provider={library.provider}
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
