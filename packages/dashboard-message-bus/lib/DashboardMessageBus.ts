import WebSocket from "isomorphic-ws";
import delay from "delay";
import { EventEmitter } from "events";
import {
  base64ToJson,
  broadcastAndAwaitFirst,
  broadcastAndDisregard,
  createMessage,
  jsonToBase64,
  startWebSocketServer
} from "./utils";
import { promisify } from "util";

interface UnfulfilledRequest {
  socket: WebSocket;
  data: WebSocket.Data;
}

export class DashboardMessageBus extends EventEmitter {
  private requestsServer: WebSocket.Server;
  private listenServer: WebSocket.Server;
  private clientSockets: WebSocket[] = [];
  private listeningSockets: WebSocket[] = [];

  private unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  constructor(
    public requestsPort: number,
    public listenPort: number,
    public host: string = "0.0.0.0"
  ) {
    super();
  }

  async start() {
    this.listenServer = await startWebSocketServer({
      host: this.host,
      port: this.listenPort
    });

    this.listenServer.on("connection", (newListener: WebSocket) => {
      newListener.on("close", () => {
        this.logToClients("Listener disconnected", "connections");

        this.listeningSockets = this.listeningSockets.filter(
          listener => listener !== newListener
        );
        this.terminateIfNoConnections();
      });

      // Require the listener to send a message *first* before being marked as ready
      newListener.once("message", () => this.addNewListeneningSocket(newListener));
    });

    this.requestsServer = await startWebSocketServer({
      host: this.host,
      port: this.requestsPort
    });

    this.requestsServer.on("connection", (newClient: WebSocket) => {
      newClient.on("message", (data: WebSocket.Data) => {
        this.processRequest(newClient, data, this.listeningSockets);
      });

      newClient.on("close", () => {
        this.logToClients("Client disconnected", "connections");

        this.clientSockets = this.clientSockets.filter(
          client => client !== newClient
        );
        this.clearClientRequests(newClient);
        this.terminateIfNoConnections();
      });

      this.logToClients("Client connected", "connections");

      this.clientSockets.push(newClient);
    });
  }

  async ready() {
    if (this.listeningSockets.length > 0) return;
    await delay(1000);
    await this.ready();
  }

  async terminate() {
    await promisify(this.requestsServer.close.bind(this.requestsServer))();
    await promisify(this.listenServer.close.bind(this.listenServer))();
    this.emit("terminate");
  }

  private async processRequest(
    socket: WebSocket,
    data: WebSocket.Data,
    listeners: WebSocket[]
  ) {
    if (typeof data !== "string") return;
    await this.ready();

    this.unfulfilledRequests.set(data, { socket, data });
    const message = base64ToJson(data);

    try {
      this.logToClients(
        `Sending message to ${listeners.length} listeners`,
        "requests"
      );
      this.logToClients(message, "requests");

      const response = await broadcastAndAwaitFirst(listeners, message);

      this.logToClients(
        `Sending response for message ${message.id}`,
        "responses"
      );
      this.logToClients(response, "responses");

      const encodedResponse = jsonToBase64(response);
      socket.send(encodedResponse);
      this.unfulfilledRequests.delete(data);

      this.invalidateMessage(message.id);
    } catch (error) {
      this.logToClients(
        `An error occurred while processing message ${message.id}`,
        "errors"
      );
      this.logToClients(error, "errors");
    }
  }

  private invalidateMessage(id: number) {
    const invalidationMessage = createMessage("invalidate", id);
    broadcastAndDisregard(this.listeningSockets, invalidationMessage);
  }

  private logToClients(logMessage: any, namespace?: string) {
    this.logTo(logMessage, this.clientSockets, namespace);
  }

  private logToListeners(logMessage: any, namespace?: string) {
    this.logTo(logMessage, this.listeningSockets, namespace);
  }

  private logTo(logMessage: any, receivers: WebSocket[], namespace?: string) {
    const payload = {
      namespace: "dashboard-message-bus",
      message: logMessage
    };

    if (namespace) {
      payload.namespace += `:${namespace}`;
    }

    const message = createMessage("log", payload);
    broadcastAndDisregard(receivers, message);
  }

  private terminateIfNoConnections() {
    if (this.clientSockets.length === 0 && this.listeningSockets.length === 0) {
      this.terminate();
    }
  }

  private clearClientRequests(client: WebSocket) {
    this.unfulfilledRequests.forEach(({ socket }, key) => {
      if (socket === client) {
        this.unfulfilledRequests.delete(key);
      }
    });
  }

  private addNewListeneningSocket(newListener: WebSocket) {
    // Process all backlogged (unfulfilled) requests on new listener connection.
    this.unfulfilledRequests.forEach(({ socket, data }) =>
      this.processRequest(socket, data, [newListener])
    );

    this.logToClients("Listener connected", "connections");

    this.listeningSockets.push(newListener);
  };
}
