import { spawn } from "child_process";
import delay from "delay";
import type { JSONRPCRequestPayload, JSONRPCErrorCallback } from "ethereum-protocol";
import type { Callback, JsonRPCResponse } from "web3/providers";
import { callbackify } from "util";
import WebSocket from "ws";
import { base64ToJson, jsonToBase64, runningJest } from "./utils";
import { MessageType } from "./types";

export class BrowserProvider {
  private socket: WebSocket;

  constructor(private port = 8080) {
    // Start a new web server if not running (will silently fail if address is already in use)
    BrowserProvider.startWebServer(this.port);
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

    const request = {
      type: MessageType.REQUEST,
      id: Date.now(),
      payload
    };

    const encodedRequest = jsonToBase64(request);

    this.socket.send(encodedRequest);

    return new Promise((resolve, reject) => {
      this.socket.on("message", (data: WebSocket.Data) => {
        if (typeof data !== "string") return;
        const response = base64ToJson(data);

        if (response.type !== MessageType.RESPONSE) return;
        if (response.id !== request.id) return;
        resolve(response.payload);
      });

      // TODO: Need to check that the error corresponds to the sent message?
      this.socket.on("error", (error: Error) => {
        reject(error);
      });

      this.socket.on("close", (code: number, reason: string) => {
        reject(new Error(reason));
      });
    });
  }


  // TODO: On the webpage display nice info using truffle decoder
  // WebSockets connection between webpage and web server
  // Click some button to prompt the metamask sending

  private async ready() {
    if (this.socket && this.socket.OPEN) return;
    this.socket = await BrowserProvider.connectToWebServerWithRetries(this.port);
  }

  // > Private functions for starting/connecting to the backend web server

  private static async connectToWebServerWithRetries(port: number, retries = 5) {
    for (let tryCount = 0; tryCount < retries; tryCount++) {
      try {
        return await BrowserProvider.connectToWebServer(port);
      } catch (e) {
        if (tryCount === retries) throw e;
        await delay(1000);
      }
    }
  }

  private static async connectToWebServer(port: number) {
    const socket = new WebSocket(`ws://localhost:${port}`);

    return new Promise<WebSocket>((resolve, reject) => {
      socket.on("open", () => resolve(socket));
      socket.on("error", reject);
    });
  }

  private static startWebServer(port = 8080) {
    const webServerPath = `${__dirname}/wss-server`;

    const executable = runningJest() ? "ts-node" : "node";

    spawn(executable, [webServerPath, String(port)], {
      detached: true,
      stdio: "ignore"
    });
  }
}
