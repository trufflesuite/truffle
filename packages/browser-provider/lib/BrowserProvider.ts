import type { JSONRPCRequestPayload, JSONRPCErrorCallback, JSONRPCResponsePayload } from "ethereum-protocol";
import { callbackify } from "util";
import WebSocket from "ws";
import { connectToServerWithRetries } from "./utils";
import { startServer, sendAndAwait } from "@truffle/browser-provider-server";

export class BrowserProvider {
  private socket: WebSocket;

  // TODO: fix the constructor args (probably an object with a bunch of options)
  constructor(private port = 8080, private dashboardWsPort = 8081) {
    // Start a new server if not running (will silently fail if address is already in use)
    // TODO: Figure out what to do when address is already in use by different app
    // TODO: Figure out what to do when the dashboard ports are already in use
    startServer(this.port, this.dashboardWsPort);
  }

  public send(payload: JSONRPCRequestPayload, callback: JSONRPCErrorCallback) {
    const sendInternal = (payload: JSONRPCRequestPayload) => this.sendInternal(payload);
    callbackify(sendInternal)(payload, callback);
  }

  public sendAsync(payload: JSONRPCRequestPayload, callback: JSONRPCErrorCallback) {
    this.send(payload, callback);
  }

  public terminate() {
    this.socket.close();
  }

  private async sendInternal(payload: JSONRPCRequestPayload): Promise<JSONRPCResponsePayload> {
    await this.ready();
    const response = await sendAndAwait(this.socket, payload);

    if (response.error) {
      throw response.error;
    }

    return response;
  }

  private async ready() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    this.socket = await connectToServerWithRetries(this.port);
  }
}
