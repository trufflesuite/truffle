import {
  base64ToJson,
  connectToMessageBusWithRetries,
  isDashboardProviderMessage,
  jsonToBase64,
  Message
} from "@truffle/dashboard-message-bus";
import { JSONRPCRequestPayload } from "ethereum-protocol";
import { promisify } from "util";
import WebSocket from "ws";
import Ganache from "ganache-core";

// TODO: This mock dashboard was copy-pasted from the dashboard-provider tests
// We should figure out whether we want to make this DRYer
export default class MockDashboard {
  socket?: WebSocket;

  constructor(public forwardProvider: Ganache.Provider) {}

  async connect(messageBusListenPort: number) {
    if (this.socket) return;
    this.socket = await connectToMessageBusWithRetries(messageBusListenPort);
    this.socket.on("message", this.handleIncomingMessage.bind(this));
    this.socket.send("ready");
  }

  disconnect() {
    this.socket?.terminate();
    this.socket = undefined;
  }

  private async handleIncomingMessage(data: WebSocket.Data) {
    if (typeof data !== "string") return;
    if (!this.socket) return;

    const message = base64ToJson(data) as Message;
    if (!isDashboardProviderMessage(message)) return;

    const responsePayload = await forwardDashboardProviderRequest(
      this.forwardProvider,
      message.payload
    );
    const response = {
      id: message.id,
      payload: responsePayload
    };

    const encodedResponse = jsonToBase64(response);
    this.socket.send(encodedResponse);
  }
}

export const forwardDashboardProviderRequest = async (
  provider: Ganache.Provider,
  payload: JSONRPCRequestPayload
) => {
  const send = promisify(provider.send.bind(provider));
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
