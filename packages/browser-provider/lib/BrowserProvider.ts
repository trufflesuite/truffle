import type {
  JSONRPCRequestPayload,
  JSONRPCErrorCallback,
  JSONRPCResponsePayload
} from "ethereum-protocol";
import { callbackify } from "util";
import WebSocket from "ws";
import delay from "delay";
import { sendAndAwait, createMessage, connectToMessageBusWithRetries, getMessageBusPorts } from "@truffle/dashboard-message-bus";
import { startDashboardInBackground } from "@truffle/dashboard";
import { timeout } from "promise-timeout";
import { BrowserProviderOptions } from "./types";

export class BrowserProvider {
  private socket: WebSocket;
  public dashboardHost: string;
  public dashboardPort: number;
  private timeoutSeconds: number;
  public keepAlive: boolean;
  private concurrentRequests: number = 0;
  private connecting: boolean = false;

  constructor(options: BrowserProviderOptions = {}) {
    this.dashboardHost = options.dashboardHost ?? "localhost";
    this.dashboardPort = options.dashboardPort ?? 5000;
    this.timeoutSeconds = options.timeoutSeconds ?? 120;
    this.keepAlive = options.keepAlive ?? false;

    // Start a dashboard at the provided port (will silently fail if the dashboard address is already in use)
    startDashboardInBackground(this.dashboardPort, this.dashboardHost);
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

  public terminate() {
    this.socket?.terminate();
  }

  private async sendInternal(
    payload: JSONRPCRequestPayload
  ): Promise<JSONRPCResponsePayload> {
    await this.ready();

    const message = createMessage("browser-provider", payload);

    this.concurrentRequests += 1;

    const { payload: response } = await timeout(
      sendAndAwait(this.socket, message),
      this.timeoutSeconds * 1000,
    );

    this.concurrentRequests -= 1;

    if (this.shouldTerminate()) {
      this.terminate();
    }

    if (response.error) {
      throw response.error;
    }

    return response;
  }

  private shouldTerminate(): boolean {
    if (this.keepAlive) return false;
    if (this.concurrentRequests !== 0) return false;
    return true;
  }

  private async ready() {
    // Don't create a new connection to the message bus while we're already connecting
    if (this.connecting) {
      await delay(1000);
      return this.ready();
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.connecting = false;
      return;
    }

    this.connecting = true;
    try {
      const { messageBusRequestsPort } = await getMessageBusPorts(this.dashboardPort, this.dashboardHost);
      this.socket = await connectToMessageBusWithRetries(messageBusRequestsPort);
    } finally {
      this.connecting = false;
    }
  }
}
