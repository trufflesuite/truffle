import WebSocket from "ws";
import { base64ToJson, jsonToBase64, sendAndAwait } from "./utils";
import delay from "delay";
import { startDashboard } from "@truffle/dashboard";
import open from "open";
import type { Express } from "express";
import { Request } from "./types";

export class BrowserProviderServer {
  providerServer: WebSocket.Server;
  connectedProviderCount = 0;

  dashboardServer: WebSocket.Server;
  dashboardSocket: WebSocket;
  dashboardExpress: Express;

  unfulfilledRequests: Map<string, Request> = new Map([]);

  start(providerPort: number, dashboardPort: number) {
    this.dashboardServer = new WebSocket.Server({ host: '0.0.0.0', port: dashboardPort });
    this.dashboardServer.on("connection", (socket: WebSocket) => {
      this.dashboardSocket = socket;

      // Process all backlogged (unfulfilled) requests on new dashboard connection.
      this.unfulfilledRequests.forEach(({ socket, data }) => this.processRequest(socket, data));
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

  // Wait until the dashboard process is started and the websocket connection is established
  async ready() {
    if (this.dashboardSocket) return;
    await delay(1000);
    await this.ready();
  }

  async processRequest(socket: WebSocket, data: WebSocket.Data) {
    if (typeof data !== "string") return;

    this.unfulfilledRequests.set(data, { socket, data });

    await this.ready();

    const decodedData = base64ToJson(data);

    let responsePayload;
    try {
      responsePayload = await sendAndAwait(this.dashboardSocket, decodedData.payload);
    } catch {
      return;
    }

    const response = {
      id: decodedData.id,
      payload: responsePayload
    };

    const encodedResponse = jsonToBase64(response);
    socket.send(encodedResponse);

    this.unfulfilledRequests.delete(data);
  }
}
