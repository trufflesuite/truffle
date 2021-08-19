import ReactJson from 'react-json-view';
import { handleBrowserProviderRequest, jsonToBase64 } from "../../utils/utils";
import { BrowserProviderRequest, Request } from "../../utils/types";
import Button from "../common/Button";
import Card from "../common/Card";

interface Props {
  request: Request;
  setRequests: (requests: Request[] | ((requests: Request[]) => Request[])) => void;
  provider: any;
  socket: WebSocket;
}

function IncomingRequest({ provider, socket, request, setRequests }: Props) {
  const removeFromRequests = () => {
    setRequests((previousRequests) => previousRequests.filter(other => other.id !== request.id));
  };

  const process = async () => {
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
          message: "User denied @truffle/browser-provider request"
        }
      }
    };

    const encodedResponse = jsonToBase64(errorResponse);

    socket.send(encodedResponse);
    removeFromRequests();
  };

  // TODO: Clean this up
  const formatBrowserProviderRequestParameters = (request: BrowserProviderRequest) => {
    switch (request.payload.method) {
      case "eth_sendTransaction":
      case "eth_signTransaction": {
        const [transaction] = request.payload.params;
        return (<ReactJson name="transaction" src={transaction as any} />);
      }
      case "eth_sign": {
        const [from, message] = request.payload.params;
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
      case "eth_signTypedData_v1":
      case "eth_signTypedData": {
        const [messageParams, from] = request.payload.params;
        const formattedMessage = messageParams.map((param: any) => {
          if (typeof param.value === "object") {
            return <ReactJson name={param.name} src={param.value} />;
          }
          return (<div><b>{param.name}</b>: {param.value}</div>);
        });

        return (
          <div>
            <div>ACCOUNT: {from}</div>
            <div className="flex gap-2">
              <div>MESSAGE:</div>
              <div>{formattedMessage}</div>
            </div>
          </div>
        );
      }
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        const [from, messageParams] = request.payload.params;
        const { message } = JSON.parse(messageParams);
        const formattedMessage = Object.entries(message).map(([key, value]) => {
          if (typeof value === "object") {
            return <ReactJson name={key} src={value as any} />;
          }
          return (<div><b>{key}</b>: {value}</div>);
        });

        return (
          <div>
            <div>ACCOUNT: {from}</div>
            <div className="flex gap-2">
              <div>MESSAGE:</div>
              <div>{formattedMessage}</div>
            </div>
          </div>
        );
      }
      case "eth_decrypt":
      default: {
        return JSON.stringify(request.payload.params);
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
