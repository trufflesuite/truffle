import WebSocket from "ws";
import { base64ToJson, jsonToBase64, sendAndAwait } from "./utils";
import delay from "delay";
import { UnfulfilledRequest } from "./types";

// TODO: Any number of senders sending to all connected listeners
// TODO: First to respond should consume the message
// TODO: socket.io for message bus
export class DashboardMessageBus {
  clientServer: WebSocket.Server;
  connectedClientCount = 0;

  dashboardServer: WebSocket.Server;
  dashboardSocket: WebSocket;

  unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  start(providerPort: number, dashboardPort: number) {
    this.dashboardServer = new WebSocket.Server({
      host: "0.0.0.0",
      port: dashboardPort
    });
    this.dashboardServer.on("connection", (socket: WebSocket) => {
      this.dashboardSocket = socket;

      // Process all backlogged (unfulfilled) requests on new dashboard connection.
      this.unfulfilledRequests.forEach(({ socket, data }) =>
        this.processRequest(socket, data)
      );
    });

    this.clientServer = new WebSocket.Server({
      host: "0.0.0.0",
      port: providerPort
    });
    this.clientServer.on("connection", (socket: WebSocket) => {
      this.connectedClientCount++;

      socket.on("message", (data: WebSocket.Data) => {
        this.processRequest(socket, data);
      });

      socket.on("close", () => {
        if (--this.connectedClientCount <= 0) {
          process.exit(0);
        }
      });
    });
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

    const message = base64ToJson(data);

    try {
      const response = await sendAndAwait(this.dashboardSocket, message);

      const encodedResponse = jsonToBase64(response);
      socket.send(encodedResponse);

      this.unfulfilledRequests.delete(data);
    } catch {
      return;
    }
  }
}
