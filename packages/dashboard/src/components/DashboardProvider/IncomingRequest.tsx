import WebSocket from "isomorphic-ws";
import ReactJson from "react-json-view";
import {useProviderResponseAdder} from "src/context/transactions/hooks";
import { handleDashboardProviderRequest, respond } from "src/utils/utils";
import Button from "../Common/Button";
import Card from "../Common/Card";
import { DashboardProviderMessage } from "@truffle/dashboard-message-bus";

interface Props {
  request: DashboardProviderMessage;
  setRequests: (
    requests:
      | DashboardProviderMessage[]
      | ((requests: DashboardProviderMessage[]) => DashboardProviderMessage[])
  ) => void;
  provider: any;
  connector: any;
  socket: WebSocket;
}

function IncomingRequest({
  provider,
  connector,
  socket,
  request,
  setRequests
}: Props) {
  const processor = useProviderResponseAdder();
  const removeFromRequests = () => {
    setRequests(previousRequests =>
      previousRequests.filter(other => other.id !== request.id)
    );
  };

  const process = async () => {
    await handleDashboardProviderRequest(request, provider, connector, socket, processor);
    removeFromRequests();
  };

  const reject = async () => {
    const errorResponse = {
      id: request.id,
      payload: {
        jsonrpc: request.payload.jsonrpc,
        id: request.payload.id,
        error: {
          code: 4001,
          message: "User rejected @truffle/dashboard-provider request"
        }
      }
    };

    respond(errorResponse, socket);
    removeFromRequests();
  };

  const formatDashboardProviderRequestParameters = (
    request: DashboardProviderMessage
  ) => {
    switch (request.payload.method) {
      case "eth_sendTransaction":
      case "eth_signTransaction": {
        const [transaction] = request.payload.params;
        return <ReactJson name="transaction" src={transaction as any} />;
      }
      case "eth_signTypedData_v1":
      case "eth_signTypedData": {
        const [messageParams, from] = request.payload.params;
        return (
          <div>
            <div>Account: {from}</div>
            <div className="flex gap-2">
              <div>Message:</div>
              <ReactJson name="message params" src={messageParams} />
            </div>
          </div>
        );
      }
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        const [from, messageParams] = request.payload.params;
        const { message } = JSON.parse(messageParams);
        return (
          <div>
            <div>Account: {from}</div>
            <div className="flex gap-2">
              <div>Message:</div>
              <ReactJson name="message" src={message} />
            </div>
          </div>
        );
      }
      case "personal_sign": {
        const [message, from] = request.payload.params;
        return (
          <div>
            <div>Account: {from}</div>
            <div className="flex gap-2">
              <div>Message:</div>
              <div>{message}</div>
            </div>
          </div>
        );
      }
      case "eth_decrypt":
      default: {
        return <ReactJson src={request.payload.params} />;
      }
    }
  };

  const header = <div className="normal-case">{request.payload.method}</div>;

  const body = <div>{formatDashboardProviderRequestParameters(request)}</div>;

  const footer = (
    <div className="flex justify-start items-center gap-2">
      <Button onClick={process}>Process</Button>
      <Button onClick={reject}>Reject</Button>
    </div>
  );

  return (
    <div key={request.id} className="flex justify-center items-center">
      <Card header={header} body={body} footer={footer} />
    </div>
  );
}

export default IncomingRequest;
