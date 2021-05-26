import WebSocket from "ws";
import { base64ToJson, jsonToBase64, sendAndAwait } from "./utils";
import delay from "delay";
import { startDashboard } from "@truffle/dashboard";
import open from "open";
import type { Express } from "express";

export class BrowserProviderServer {
  providerServer: WebSocket.Server;
  connectedProviderCount = 0;

  frontendServer: WebSocket.Server;
  frontendSocket: WebSocket;
  dashboardExpress: Express;

  start(providerPort: number, frontendPort: number) {
    this.frontendServer = new WebSocket.Server({ host: '0.0.0.0', port: frontendPort });
    this.frontendServer.on("connection", (socket: WebSocket) => {
      this.frontendSocket = socket;

      // TODO: Do we want to terminate the web server when the browser tab closes
      // or do we allow the user to close and re-open again?
      socket.on("close", () => {
        process.exit(1);
      });
    });

    this.providerServer = new WebSocket.Server({ host: '0.0.0.0', port: providerPort });
    this.providerServer.on("connection", (socket: WebSocket) => {
      this.connectedProviderCount++;

      socket.on("message", (data: WebSocket.Data) => {
        this.processRequest(socket, data);
      });

      socket.on("close", () => {
        if (--this.connectedProviderCount <= 0) {
          process.exit(0);
        }
      });
    });

    this.dashboardExpress = startDashboard(5000);
    open("http://localhost:5000");
  }

  // Wait until the frontend process is started and the websockets connection is established
  async ready() {
    if (this.frontendSocket) return;
    await delay(1000);
    await this.ready();
  }

  async processRequest(socket: WebSocket, data: WebSocket.Data) {
    await this.ready();

    if (typeof data !== "string") return;
    const decodedData = base64ToJson(data);

    const responsePayload = await sendAndAwait(this.frontendSocket, decodedData.payload);

    const response = {
      id: decodedData.id,
      payload: responsePayload
    };

    const encodedResponse = jsonToBase64(response);

    socket.send(encodedResponse);
  }
}
