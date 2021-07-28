import WebSocket from "ws";
import { base64ToJson, broadcastAndAwaitFirst, jsonToBase64 } from "./utils";
import delay from "delay";
import { UnfulfilledRequest } from "./types";

// TODO: Any number of senders sending to all connected listeners
// TODO: First to respond should consume the message
// TODO: socket.io for message bus
export class DashboardMessageBus {
  requestsServer: WebSocket.Server;
  clients: WebSocket[] = [];

  listenServer: WebSocket.Server;
  listeners: WebSocket[] = [];

  unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  start(requestsPort: number, listenPort: number) {
    this.listenServer = new WebSocket.Server({
      host: "0.0.0.0",
      port: listenPort
    });

    this.listenServer.on("connection", (socket: WebSocket) => {
      this.listeners.push(socket);
      console.log(this.listeners.length);

      socket.on("close", () => {
        this.listeners = this.listeners.filter((listener) => listener !== socket);
        console.log(this.listeners.length);
      });

      // Process all backlogged (unfulfilled) requests on new dashboard connection.
      this.unfulfilledRequests.forEach(({ socket, data }) =>
        this.processRequest(socket, data)
      );
    });

    this.requestsServer = new WebSocket.Server({
      host: "0.0.0.0",
      port: requestsPort
    });

    this.requestsServer.on("connection", (socket: WebSocket) => {
      this.clients.push(socket);

      socket.on("message", (data: WebSocket.Data) => {
        this.processRequest(socket, data);
      });

      socket.on("close", () => {
        this.clients = this.clients.filter((client) => client !== socket);
        if (this.clients.length === 0) {
          process.exit(0);
        }
      });
    });
  }

  // Wait until the dashboard process is started and the websocket connection is established
  async ready() {
    if (this.listeners.length > 0) return;
    await delay(1000);
    await this.ready();
  }

  async processRequest(socket: WebSocket, data: WebSocket.Data) {
    if (typeof data !== "string") return;

    this.unfulfilledRequests.set(data, { socket, data });

    await this.ready();

    const message = base64ToJson(data);

    try {
      const response = await broadcastAndAwaitFirst(this.listeners, message);
      const encodedResponse = jsonToBase64(response);
      socket.send(encodedResponse);
      this.unfulfilledRequests.delete(data);
    } catch {
      return;
    }
  }
}
