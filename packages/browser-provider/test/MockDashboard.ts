import { base64ToJson, connectToMessageBusWithRetries, jsonToBase64, Message } from "@truffle/dashboard-message-bus";
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import WebSocket from "ws";
import Ganache from "ganache-core";

export default class MockDashboard {
  socket?: WebSocket;

  constructor(public forwardProvider: Ganache.Provider) {}

  async connect(messageBusListenPort: number) {
    if (this.socket) return;
    this.socket = await connectToMessageBusWithRetries(messageBusListenPort);
    this.socket.on('message', this.handleIncomingMessage.bind(this));
  }

  disconnect() {
    this.socket?.terminate();
    this.socket = undefined;
  }

  private async handleIncomingMessage(data: WebSocket.Data) {
    if (typeof data !== 'string') return;
    if (!this.socket) return;

    const message = base64ToJson(data) as Message;
    if (message.type !== 'browser-provider') return;

    const responsePayload = await forwardBrowserProviderRequest(this.forwardProvider, message.payload);
    const response = {
      id: message.id,
      payload: responsePayload
    };

    const encodedResponse = jsonToBase64(response);
    this.socket.send(encodedResponse);
  }
}

// TODO: This was copy-pasted from Dashboard, have to make this DRYer
export const forwardBrowserProviderRequest = async (
  provider: Ganache.Provider,
  payload: JSONRPCRequestPayload
) => {
  const send = promisify(provider.send.bind(provider)) as any;
  try {
    const response = await send(payload);
    return response;
  } catch (error) {
    return {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      error
    };
  }
};
