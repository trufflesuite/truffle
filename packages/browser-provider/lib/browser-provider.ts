import type { JSONRPCRequestPayload, JSONRPCErrorCallback } from "ethereum-protocol";
import type { Callback, JsonRPCResponse } from "web3/providers";
import { callbackify } from "util";
import WebSocket from "ws";
import { connectToWebServerWithRetries, sendAndAwait, startWebServer } from "./utils";

export class BrowserProvider {
  private socket: WebSocket;

  constructor(private port = 8080) {
    // Start a new web server if not running (will silently fail if address is already in use)
    startWebServer(this.port);
  }

  public send(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    const sendInternal = (
      payload: JSONRPCRequestPayload
    ) => this.sendInternal(payload);
    callbackify(sendInternal)(payload, callback);
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    this.send(payload, callback);
  }

  private async sendInternal(payload: JSONRPCRequestPayload): Promise<JsonRPCResponse> {
    await this.ready();
    return await sendAndAwait(this.socket, payload);
  }

  private async ready() {
    if (this.socket && this.socket.OPEN) return;
    this.socket = await connectToWebServerWithRetries(this.port);
  }
}
