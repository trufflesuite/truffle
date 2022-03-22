import WebSocket from "isomorphic-ws";
import { useEffect } from "react";
import {
  handleDashboardProviderRequest,
  isInteractiveRequest,
  isUnsupportedRequest,
  respondToUnsupportedRequest
} from "src/utils/utils";
import Card from "src/components/common/Card";
import IncomingRequest from "./IncomingRequest";
import Migrations from "../Migrations/Migrations";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus";
import { useConnect } from "wagmi";

interface Props {
  paused: boolean;
  requests: DashboardProviderMessage[];
  setRequests: (
    requests:
      | DashboardProviderMessage[]
      | ((requests: DashboardProviderMessage[]) => DashboardProviderMessage[])
  ) => void;
  socket: WebSocket;
  migrations: any;
}

function DashboardProvider({ paused, socket, requests, setRequests, migrations }: Props) {
  const [{ data: connectData }] = useConnect();
  const provider = connectData.connector?.getProvider();
  const connector = connectData.connector;

  useEffect(() => {
    const removeFromRequests = (id: number) => {
      setRequests(previousRequests =>
        previousRequests.filter(request => request.id !== id)
      );
    };

    if (!connectData.connected || !provider) return;
    if (paused) return;

    // Automatically respond with an error for unsupported requests
    requests.filter(isUnsupportedRequest).forEach(request => {
      respondToUnsupportedRequest(request, socket);
      removeFromRequests(request.id);
    });

    // Automatically handle all non-interactive requests
    requests
      .filter(
        request =>
          !isInteractiveRequest(request) && !isUnsupportedRequest(request)
      )
      .forEach(request => {
        handleDashboardProviderRequest(request, provider, connector, socket);
        removeFromRequests(request.id);
      });
  }, [paused, requests, setRequests, socket, connectData, provider, connector]);

  const incomingRequests =
    connectData.connected && provider && socket
      ? requests
          .filter(isInteractiveRequest)
          .map(request => (
            <IncomingRequest
              key={request.id}
              request={request}
              setRequests={setRequests}
              provider={provider}
              connector={connector}
              socket={socket}
            />
          ))
      : [];

  return (
    <div className="flex justify-center items-center py-20">
      <div className="mx-3 w-1/4 max-w-3xl h-2/3">
        <Migrations migrations={migrations} />
      </div>
      <div className="mx-3 w-3/4 max-w-3xl h-2/3">
        <Card header="Incoming Requests" body={incomingRequests} />
      </div>
    </div>
  );
}

export default DashboardProvider;
