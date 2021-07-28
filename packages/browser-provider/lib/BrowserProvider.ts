import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from "ethereum-protocol";
import { callbackify } from "util";
import WebSocket from "ws";
import { connectToServerWithRetries, getServerPort } from "./utils";
import { sendAndAwait, createMessage } from "@truffle/dashboard-message-bus";
import { startDashboardInBackground } from "@truffle/dashboard";

export class BrowserProvider {
  private socket: WebSocket;

  constructor(private dashboardPort = 5000) {
    // Start a dashboard at the provided port (will silently fail if address is already in use)
    startDashboardInBackground(dashboardPort);
  }

  public send(payload: JSONRPCRequestPayload, callback: JSONRPCErrorCallback) {
    const sendInternal = (payload: JSONRPCRequestPayload) =>
      this.sendInternal(payload);
    callbackify(sendInternal)(payload, callback);
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback
  ) {
    this.send(payload, callback);
  }

  public terminate() {
    this.socket.close();
  }

  private async sendInternal(
    payload: JSONRPCRequestPayload
  ): Promise<JSONRPCResponsePayload> {
    await this.ready();

    const message = createMessage("browser-provider", payload);
    const { payload: response } = await sendAndAwait(this.socket, message);
    if (response.error) {
      throw response.error;
    }

    return response;
  }

  private async ready() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    const port = await getServerPort(this.dashboardPort);

    this.socket = await connectToServerWithRetries(port);
  }
}
