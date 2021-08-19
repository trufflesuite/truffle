import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from "ethereum-protocol";
import { callbackify } from "util";
import WebSocket from "ws";
import { getMessageBusPorts } from "./utils";
import { sendAndAwait, createMessage, connectToMessageBusWithRetries } from "@truffle/dashboard-message-bus";
import { startDashboardInBackground } from "@truffle/dashboard";
import { timeout } from "promise-timeout";
import { BrowserProviderOptions } from "./types";

export class BrowserProvider {
  private socket: WebSocket;
  private dashboardPort: number;
  private timeoutSeconds: number;

  constructor(options: BrowserProviderOptions = {}) {
    this.dashboardPort = options.dashboardPort ?? 5000;
    this.timeoutSeconds = options.timeoutSeconds ?? 120;

    // Start a dashboard at the provided port (will silently fail if the dashboard address is already in use)
    startDashboardInBackground(this.dashboardPort);
  }

  public send(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback
  ) {
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

  private terminate() {
    this.socket.terminate();
  }

  private async sendInternal(
    payload: JSONRPCRequestPayload
  ): Promise<JSONRPCResponsePayload> {
    await this.ready();

    const message = createMessage("browser-provider", payload);

    const { payload: response } = await timeout(
      sendAndAwait(this.socket, message),
      this.timeoutSeconds * 1000,
    ).finally(() => this.terminate());

    if (response.error) {
      throw response.error;
    }

    return response;
  }

  private async ready() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    const { messageBusRequestsPort } = await getMessageBusPorts(this.dashboardPort);
    this.socket = await connectToMessageBusWithRetries(messageBusRequestsPort);
  }
}
