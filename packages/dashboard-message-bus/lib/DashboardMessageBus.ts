import WebSocket from "ws";
import delay from "delay";
import { EventEmitter } from "events";
import { base64ToJson, broadcastAndAwaitFirst, jsonToBase64 } from "./utils";
import { UnfulfilledRequest } from "./types";

// TODO: Do we want to use socket.io for the message bus?
export class DashboardMessageBus extends EventEmitter {
  requestsServer: WebSocket.Server;
  listenServer: WebSocket.Server;
  clientSockets: WebSocket[] = [];
  listeningSockets: WebSocket[] = [];

  unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  start(requestsPort: number, listenPort: number, host: string = "0.0.0.0") {
    this.listenServer = new WebSocket.Server({
      host,
      port: listenPort
    });

    this.listenServer.on("connection", (newListener: WebSocket) => {
      newListener.on("close", () => {
        this.listeningSockets = this.listeningSockets.filter((listener) => listener !== newListener);
        this.terminateIfNoConnections();
      });

      // Process all backlogged (unfulfilled) requests on new listener connection.
      this.unfulfilledRequests.forEach(({ socket, data }) =>
        this.processRequest(socket, data, [newListener])
      );

      this.listeningSockets.push(newListener);
    });

    this.requestsServer = new WebSocket.Server({
      host,
      port: requestsPort
    });

    this.requestsServer.on("connection", (newClient: WebSocket) => {
      newClient.on("message", (data: WebSocket.Data) => {
        this.processRequest(newClient, data, this.listeningSockets);
      });

      newClient.on("close", () => {
        this.clientSockets = this.clientSockets.filter((client) => client !== newClient);
        this.clearClientRequests(newClient);
        this.terminateIfNoConnections();
      });

      this.clientSockets.push(newClient);
    });
  }

  async ready() {
    if (this.listeningSockets.length > 0) return;
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

  private terminateIfNoConnections() {
    if (this.clientSockets.length === 0 && this.listeningSockets.length === 0) {
      this.terminate();
    }
  }

  private terminate() {
    this.requestsServer.close();
    this.listenServer.close();
    this.emit("terminate");
  }

  private clearClientRequests(client: WebSocket) {
    this.unfulfilledRequests.forEach(({ socket }, key) => {
      if (socket === client) {
        this.unfulfilledRequests.delete(key);
      }
    });
  }
}
