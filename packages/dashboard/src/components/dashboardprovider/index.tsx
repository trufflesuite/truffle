import { useEffect } from "react";
import { useConnect } from "wagmi";
import type { WorkflowCompileResult } from "@truffle/compile-common";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import {
  handleDashboardProviderRequest,
  isInteractiveRequest,
  isUnsupportedRequest,
  respondToUnsupportedRequest
} from "src/utils/utils";
import Card from "src/components/common/Card";
import IncomingRequest from "./IncomingRequest";
import { useDecoder, DecoderContext } from "../../decoding";

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
  workflowCompileResult: WorkflowCompileResult | undefined;
}

function DashboardProvider({
  paused,
  requests,
  setRequests,
  workflowCompileResult
}: Props) {
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

  const decoder = useDecoder({
    workflowCompileResult,
    provider
  });

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
        <DecoderContext.Provider value={decoder}>
          <Card header="Incoming Requests" body={incomingRequests} />
        </DecoderContext.Provider>
      </div>
    </div>
  );
}

export default DashboardProvider;
