import { useEffect } from "react";
import {
  handleDashboardProviderRequest,
  isInteractiveRequest,
  isUnsupportedRequest,
  respondToUnsupportedRequest
} from "../../utils/utils";
import Card from "../common/Card";
import IncomingRequest from "./IncomingRequest";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { useConnect } from "wagmi";
import { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";

interface Props {
  paused: boolean;
  requests: ReceivedMessageLifecycle<DashboardProviderMessage>[];
  setRequests: (
    requests:
      | ReceivedMessageLifecycle<DashboardProviderMessage>[]
      | ((
          requests: ReceivedMessageLifecycle<DashboardProviderMessage>[]
        ) => ReceivedMessageLifecycle<DashboardProviderMessage>[])
  ) => void;
}

function DashboardProvider({ paused, requests, setRequests }: Props) {
  const [{ data: connectData }] = useConnect();
  const provider = connectData.connector?.getProvider();
  const connector = connectData.connector;

  useEffect(() => {
    const removeFromRequests = (id: number) => {
      setRequests(previousRequests =>
        previousRequests.filter(request => request.message.id !== id)
      );
    };

    if (!connectData.connected || !provider) return;
    if (paused) return;

    // Automatically respond with an error for unsupported requests
    requests.filter(isUnsupportedRequest).forEach(request => {
      respondToUnsupportedRequest(request);
      removeFromRequests(request.message.id);
    });

    // Automatically handle all non-interactive requests
    requests
      .filter(
        request =>
          !isInteractiveRequest(request) && !isUnsupportedRequest(request)
      )
      .forEach(request => {
        handleDashboardProviderRequest(request, provider, connector);
        removeFromRequests(request.message.id);
      });
  }, [paused, requests, setRequests, connectData, provider, connector]);

  const incomingRequests =
    connectData.connected && provider
      ? requests
          .filter(isInteractiveRequest)
          .map(request => (
            <IncomingRequest
              request={request}
              setRequests={setRequests}
              provider={provider}
              connector={connector}
            />
          ))
      : [];

  return (
    <div className="flex justify-center items-center py-20">
      <div className="mx-3 w-3/4 max-w-4xl h-2/3">
        <Card header="Incoming Requests" body={incomingRequests} />
      </div>
    </div>
  );
}

export default DashboardProvider;
