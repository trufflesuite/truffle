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
  publisher: WebSocket;
  data: WebSocket.Data;
}

export class DashboardMessageBus extends EventEmitter {
  private publishServer: WebSocket.Server;
  private subscribeServer: WebSocket.Server;
  private publishers: WebSocket[] = [];
  private subscribers: WebSocket[] = [];

  private unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  constructor(
    public publishPort: number,
    public subscribePort: number,
    public host: string = "0.0.0.0"
  ) {
    super();
  }

  async start() {
    this.subscribeServer = await startWebSocketServer({
      host: this.host,
      port: this.subscribePort
    });

    this.subscribeServer.on("connection", (newSubscriber: WebSocket) => {
      newSubscriber.on("close", () => {
        this.logToPublishers("Subscriber disconnected", "connections");

        this.subscribers = this.subscribers.filter(
          subscriber => subscriber !== newSubscriber
        );

        this.terminateIfNoConnections();
      });

      // Require the subscriber to send a message *first* before being marked as ready
      newSubscriber.once("message", () => this.addNewSubscriber(newSubscriber));
    });

    this.publishServer = await startWebSocketServer({
      host: this.host,
      port: this.publishPort
    });

    this.publishServer.on("connection", (newPublisher: WebSocket) => {
      newPublisher.on("message", (data: WebSocket.Data) => {
        this.processRequest(newPublisher, data, this.subscribers);
      });

      newPublisher.on("close", () => {
        this.logToPublishers("Publisher disconnected", "connections");

        this.publishers = this.publishers.filter(
          publisher => publisher !== newPublisher
        );

        this.clearRequestsForPublisher(newPublisher);
        this.terminateIfNoConnections();
      });

      this.logToPublishers("Publisher connected", "connections");

      this.publishers.push(newPublisher);
    });
  }

  async ready() {
    if (this.subscribers.length > 0) return;
    await delay(1000);
    await this.ready();
  }

  async terminate() {
    await promisify(this.publishServer.close.bind(this.publishServer))();
    await promisify(this.subscribeServer.close.bind(this.subscribeServer))();
    this.emit("terminate");
  }

  private async processRequest(
    publisher: WebSocket,
    data: WebSocket.Data,
    subscribers: WebSocket[]
  ) {
    if (typeof data !== "string") {
      data = data.toString();
    }

    await this.ready();

    this.unfulfilledRequests.set(data, { publisher, data });
    const message = base64ToJson(data);

    try {
      this.logToPublishers(
        `Sending message to ${subscribers.length} subscribers`,
        "requests"
      );
      this.logToPublishers(message, "requests");

      const response = await broadcastAndAwaitFirst(subscribers, message);

      this.logToPublishers(
        `Sending response for message ${message.id}`,
        "responses"
      );
      this.logToPublishers(response, "responses");

      const encodedResponse = jsonToBase64(response);
      publisher.send(encodedResponse);
      this.unfulfilledRequests.delete(data);

      this.invalidateMessage(message.id);
    } catch (error) {
      this.logToPublishers(
        `An error occurred while processing message ${message.id}`,
        "errors"
      );
      this.logToPublishers(error, "errors");
    }
  }

  private invalidateMessage(id: number) {
    const invalidationMessage = createMessage("invalidate", id);
    broadcastAndDisregard(this.subscribers, invalidationMessage);
  }

  private logToPublishers(logMessage: any, namespace?: string) {
    this.logTo(logMessage, this.publishers, namespace);
  }

  private logToSubscribers(logMessage: any, namespace?: string) {
    this.logTo(logMessage, this.subscribers, namespace);
  }

  private logToAll(logMessage: any, namespace?: string) {
    this.logToPublishers(logMessage, namespace);
    this.logToSubscribers(logMessage, namespace);
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
    if (this.publishers.length === 0 && this.subscribers.length === 0) {
      this.terminate();
    }
  }

  private clearRequestsForPublisher(publisher: WebSocket) {
    this.unfulfilledRequests.forEach(({ publisher: requestPublisher }, key) => {
      if (requestPublisher === publisher) {
        this.unfulfilledRequests.delete(key);
      }
    });
  }

  private addNewSubscriber(newSubscriber: WebSocket) {
    // Process all backlogged (unfulfilled) requests on new subscriber connection.
    this.unfulfilledRequests.forEach(({ publisher, data }) =>
      this.processRequest(publisher, data, [newSubscriber])
    );

    this.logToPublishers("Subscriber connected", "connections");

    this.subscribers.push(newSubscriber);
  };
}
