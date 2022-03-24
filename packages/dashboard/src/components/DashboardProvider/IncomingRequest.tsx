import ReactJson from "react-json-view";
import { handleDashboardProviderRequest } from "../../utils/utils";
import Button from "../common/Button";
import Card from "../common/Card";
import { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";

interface Props {
  request: ReceivedMessageLifecycle<DashboardProviderMessage>;
  setRequests: (
    requests:
      | ReceivedMessageLifecycle<DashboardProviderMessage>[]
      | ((
          requests: ReceivedMessageLifecycle<DashboardProviderMessage>[]
        ) => ReceivedMessageLifecycle<DashboardProviderMessage>[])
  ) => void;
  provider: any;
  connector: any;
}

function IncomingRequest({ provider, connector, request, setRequests }: Props) {
  const removeFromRequests = () => {
    setRequests(previousRequests =>
      previousRequests.filter(other => other.message.id !== request.message.id)
    );
  };

  const process = async () => {
    await handleDashboardProviderRequest(request, provider, connector);
    removeFromRequests();
  };

  const reject = async () => {
    const payload = {
      jsonrpc: request.message.payload.jsonrpc,
      id: request.message.payload.id,
      error: {
        code: 4001,
        message: "User rejected @truffle/dashboard-provider request"
      }
    };

    request.respond({ payload });
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

  const header = (
    <div className="normal-case">{request.message.payload.method}</div>
  );

  const body = (
    <div>{formatDashboardProviderRequestParameters(request.message)}</div>
  );

  const footer = (
    <div className="flex justify-start items-center gap-2">
      <Button onClick={process} text="Process" />
      <Button onClick={reject} text="Reject" />
    </div>
  );

  return (
    <div key={request.message.id} className="flex justify-center items-center">
      <Card header={header} body={body} footer={footer} />
    </div>
  );
}

export default IncomingRequest;
