import WebSocket from "isomorphic-ws";
import { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { providers } from "ethers";
import { handleBrowserProviderRequest, isInteractiveRequest, isUnsupportedRequest, respondToUnsupportedRequest } from "../../utils/utils";
import Card from "../common/Card";
import IncomingRequest from "./IncomingRequest";
import { BrowserProviderMessage } from "@truffle/dashboard-message-bus";

interface Props {
  requests: BrowserProviderMessage[];
  setRequests: (requests: BrowserProviderMessage[] | ((requests: BrowserProviderMessage[]) => BrowserProviderMessage[])) => void;
  socket?: WebSocket;
}

function BrowserProvider({ socket, requests, setRequests }: Props) {
  const [hasConfirmedMainnet, setHasConfirmedMainnet] = useState<boolean>(false);
  const { account, library } = useWeb3React<providers.Web3Provider>();

  useEffect(() => {
    const removeFromRequests = (id: number) => {
      setRequests((previousRequests) => previousRequests.filter(request => request.id !== id));
    };

    if (!account || !library || !socket) return;

    // Automatically respond with an error for unsupported requests
    requests
      .filter(isUnsupportedRequest)
      .forEach((request) => {
        respondToUnsupportedRequest(request, socket);
        removeFromRequests(request.id);
      });

    // Automatically handle all non-interactive requests
    requests
      .filter((request) => !isInteractiveRequest(request) && !isUnsupportedRequest(request))
      .forEach((request) => {
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
          hasConfirmedMainnet={hasConfirmedMainnet}
          setHasConfirmedMainnet={setHasConfirmedMainnet}
        />
      ))
    : [];

  return (
    <div className="flex justify-center items-center py-20">
      <div className="mx-3 w-3/4 max-w-4xl h-2/3">
        <Card header="INCOMING REQUESTS" body={incomingRequests}/>
      </div>
    </div>
  );
}

export default BrowserProvider;
