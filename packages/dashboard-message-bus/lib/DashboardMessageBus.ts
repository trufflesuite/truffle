import WebSocket from "ws";
import { base64ToJson, broadcastAndAwaitFirst, jsonToBase64 } from "./utils";
import delay from "delay";
import { UnfulfilledRequest } from "./types";

// TODO: Do we want to use socket.io for the message bus?
export class DashboardMessageBus {
  requestsServer: WebSocket.Server;
  listenServer: WebSocket.Server;
  clients: WebSocket[] = [];
  listeners: WebSocket[] = [];
  unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  start(requestsPort: number, listenPort: number) {
    this.listenServer = new WebSocket.Server({
      host: "0.0.0.0",
      port: listenPort
    });

    this.listenServer.on("connection", (newListener: WebSocket) => {
      newListener.on("close", () => {
        this.listeners = this.listeners.filter((listener) => listener !== newListener);
        this.terminateIfNoConnections();
      });

      // Process all backlogged (unfulfilled) requests on new listener connection.
      this.unfulfilledRequests.forEach(({ socket, data }) =>
        this.processRequest(socket, data, [newListener])
      );

      this.listeners.push(newListener);
    });

    this.requestsServer = new WebSocket.Server({
      host: "0.0.0.0",
      port: requestsPort
    });

    this.requestsServer.on("connection", (newClient: WebSocket) => {
      newClient.on("message", (data: WebSocket.Data) => {
        this.processRequest(newClient, data, this.listeners);
      });

      newClient.on("close", () => {
        this.clients = this.clients.filter((client) => client !== newClient);
        this.clearClientRequests(newClient);
        this.terminateIfNoConnections();
      });

      this.clients.push(newClient);
    });
  }

  async ready() {
    if (this.listeners.length > 0) return;
    await delay(1000);
    await this.ready();
  }

  private async processRequest(socket: WebSocket, data: WebSocket.Data, listeners: WebSocket[]) {
    if (typeof data !== "string") return;
    await this.ready();
    this.unfulfilledRequests.set(data, { socket, data });
    const message = base64ToJson(data);

    try {
      const response = await broadcastAndAwaitFirst(listeners, message);
      const encodedResponse = jsonToBase64(response);
      socket.send(encodedResponse);
      this.unfulfilledRequests.delete(data);
    } catch {
      return;
    }
  }

  // TODO: Do we want to provide a few seconds "grace period" to reconnect?
  private terminateIfNoConnections() {
    if (this.clients.length === 0 && this.listeners.length === 0) {
      process.exit(0);
    }
  }

  private clearClientRequests(client: WebSocket) {
    this.unfulfilledRequests.forEach(({ socket }, key) => {
      if (socket === client) {
        this.unfulfilledRequests.delete(key);
      }
    });
  }
}
