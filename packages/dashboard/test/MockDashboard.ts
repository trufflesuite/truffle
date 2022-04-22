import {
  base64ToJson,
  connectToMessageBusWithRetries,
  isDashboardProviderMessage,
  jsonToBase64,
  Message
} from "@truffle/dashboard-message-bus";
import type { JSONRPCRequestPayload } from "ethereum-protocol";
import WebSocket from "ws";
import { EthereumProvider } from "ganache";

// NOTE This mock dashboard was copy-pasted from the dashboard-provider tests
export default class MockDashboard {
  socket?: WebSocket;

  constructor(public forwardProvider: EthereumProvider) {}

  async connect(subscribePort: number) {
    if (this.socket) return;
    this.socket = await connectToMessageBusWithRetries(subscribePort);
    this.socket.on("message", this.handleIncomingMessage.bind(this));
    this.socket.send("ready");
  }

  disconnect() {
    this.socket?.terminate();
    this.socket = undefined;
  }

  private async handleIncomingMessage(data: WebSocket.Data) {
    if (!this.socket) return;

    if (typeof data !== "string") {
      data = data.toString();
    }

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
  provider: EthereumProvider,
  payload: JSONRPCRequestPayload
) => {
  try {
    const { method, params } = payload;

    // yeah, the any below is ugly, but the ganache API doesn't appear to expose
    // a method type that I can easily import and use
    const result = await provider.request({ method, params } as any);
    const reply = {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      result
    };

    return reply;
  } catch (error) {
    return {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      error
    };
  }
};
