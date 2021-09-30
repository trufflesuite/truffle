import WebSocket from "isomorphic-ws";
import ReactJson from "react-json-view";
import { handleBrowserProviderRequest, respond } from "../../utils/utils";
import Button from "../common/Button";
import Card from "../common/Card";
import { useWeb3React } from "@web3-react/core";
import { BrowserProviderMessage } from "@truffle/dashboard-message-bus";

interface Props {
  request: BrowserProviderMessage;
  setRequests: (requests: BrowserProviderMessage[] | ((requests: BrowserProviderMessage[]) => BrowserProviderMessage[])) => void;
  provider: any;
  socket: WebSocket;
  hasConfirmedMainnet: boolean;
  setHasConfirmedMainnet: (hasConfirmedMainnet: boolean) => void;
}

function IncomingRequest({ provider, socket, request, setRequests, hasConfirmedMainnet, setHasConfirmedMainnet }: Props) {
  const { chainId } = useWeb3React();

  const removeFromRequests = () => {
    setRequests((previousRequests) => previousRequests.filter(other => other.id !== request.id));
  };

  const process = async () => {
    if (chainId === 1 && !hasConfirmedMainnet) {
      if (!confirm("You are connected to Ethereum Mainnet, are you sure you wish to continue?\n\nThis confirmation will only be displayed once per session.")) return;
      setHasConfirmedMainnet(true);
    }
    await handleBrowserProviderRequest(request, provider, socket);
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
          message: "User rejected @truffle/browser-provider request"
        }
      }
    };

    respond(errorResponse, socket);
    removeFromRequests();
  };

  const formatBrowserProviderRequestParameters = (request: BrowserProviderMessage) => {
    switch (request.payload.method) {
      case "eth_sendTransaction":
      case "eth_signTransaction": {
        const [transaction] = request.payload.params;
        return (<ReactJson name="transaction" src={transaction as any} />);
      }
      case "eth_signTypedData_v1":
      case "eth_signTypedData": {
        const [messageParams, from] = request.payload.params;
        return (
          <div>
            <div>ACCOUNT: {from}</div>
            <div className="flex gap-2">
              <div>MESSAGE:</div>
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
            <div>ACCOUNT: {from}</div>
            <div className="flex gap-2">
              <div>MESSAGE:</div>
              <ReactJson name="message" src={message} />
            </div>
          </div>
        );
      }
      case "personal_sign": {
        const [message, from] = request.payload.params;
        return (
          <div>
            <div>ACCOUNT: {from}</div>
            <div className="flex gap-2">
              <div>MESSAGE:</div>
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

  const header = request.payload.method;

  const body = (
    <div>
      {formatBrowserProviderRequestParameters(request)}
    </div>
  );

  const footer = (
    <div className="flex justify-start items-center gap-2">
      <Button onClick={process} text="PROCESS" />
      <Button onClick={reject} text="REJECT" />
    </div>
  );

  return (
    <div key={request.id} className="flex justify-center items-center">
      <Card header={header} body={body} footer={footer} />
    </div>
  );
}

export default IncomingRequest;
