import ReactJson from "react-json-view";
import { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import { handleDashboardProviderRequest } from "../../utils/utils";
import Button from "../common/Button";
import Card from "../common/Card";
import { useState } from "react";
import Transaction from "./Transaction";
import { DecoderContext } from "../../decoding";

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
  const [disable, setDisable] = useState(false);
  const removeFromRequests = () => {
    setRequests(previousRequests =>
      previousRequests.filter(other => other.message.id !== request.message.id)
    );
  };

  const process = async () => {
    setDisable(true);
    await handleDashboardProviderRequest(request, provider, connector);
    removeFromRequests();
  };

  const reject = async () => {
    const payload = {
      jsonrpc: request.message.payload.jsonrpc,
      id: request.message.payload.id,
      error: {
        code: 4001,
        message: "User rejected @truffle/dashboard request"
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
        return <DecoderContext.Consumer>{decoder => (
          <Transaction
            transaction={transaction}
            decoder={decoder}
            />
        )}</DecoderContext.Consumer>;
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

  const footer = disable ? (
    <div className="flex justify-start items-center gap-2">
      <Button disabled onClick={() => {}}>
        Processing...
      </Button>
    </div>
  ) : (
    <div className="flex justify-start items-center gap-2">
      <Button
        onClick={() => {
          process();
          setDisable(true);
        }}
      >
        Process
      </Button>
      <Button onClick={reject}>Reject</Button>
    </div>
  );

  return (
    <div key={request.message.id} className="flex justify-center items-center">
      <Card header={header} body={body} footer={footer} />
    </div>
  );
}

export default IncomingRequest;
