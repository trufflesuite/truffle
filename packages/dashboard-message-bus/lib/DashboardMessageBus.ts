import WebSocket from "isomorphic-ws";
import { EventEmitter } from "events";
import {
  base64ToJson,
  createMessage,
  jsonToBase64
} from "@truffle/dashboard-message-bus-common";

import {
  broadcastAndAwaitFirst,
  broadcastAndDisregard,
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
  private readyPromise: Promise<void>;
  private resolveReadyPromise: () => void;

  private unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  constructor(
    public publishPort: number,
    public subscribePort: number,
    public host: string = "localhost"
  ) {
    super();
    this.resetReadyState();
  }

  /**
   * Start the DashboardMessageBus
   * @dev This starts separate websocket servers for subscribers/publishers
   */
  async start() {
    this.subscribeServer = await startWebSocketServer({
      host: this.host,
      port: this.subscribePort
    });

    this.subscribeServer.on("connection", (newSubscriber: WebSocket) => {
      newSubscriber.once("close", () => {
        this.removeSubscriber(newSubscriber);
      });

      // Require the subscriber to send a message *first* before being added
      newSubscriber.once("message", () => this.addSubscriber(newSubscriber));
    });

    this.publishServer = await startWebSocketServer({
      host: this.host,
      port: this.publishPort
    });

    this.publishServer.on("connection", (newPublisher: WebSocket) => {
      newPublisher.once("close", () => {
        this.removePublisher(newPublisher);
      });

      this.addPublisher(newPublisher);
    });
  }

  /**
   * A promise that resolves when the message bus is ready to process requests
   * (i.e. having any subscribers).
   */
  get ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Close both websocket servers
   * @dev Emits a "terminate" event
   */
  async terminate() {
    await promisify(this.publishServer.close.bind(this.publishServer))();
    await promisify(this.subscribeServer.close.bind(this.subscribeServer))();
    this.emit("terminate");
  }

  /**
   * Process a message `data` coming from `publisher` by sending it to `subscribers`
   * and return the first received response to the `publisher`
   */
  private async processRequest(
    publisher: WebSocket,
    data: WebSocket.Data,
    subscribers: WebSocket[]
  ) {
    // convert to string for uniformity since WebSocket.Data can take other forms
    if (typeof data !== "string") {
      data = data.toString();
    }

    await this.ready;

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

  /**
   * Add a publisher so it can be used to send requests to
   * @dev Also sends all backlogged (unfulfilled) requests upon connection
   */
  private addSubscriber(newSubscriber: WebSocket) {
    this.unfulfilledRequests.forEach(({ publisher, data }) =>
      this.processRequest(publisher, data, [newSubscriber])
    );

    this.logToPublishers("Subscriber connected", "connections");

    this.subscribers.push(newSubscriber);

    if (this.subscribers.length == 1) {
      this.resolveReadyPromise();
    }
  }

  /**
   * Remove a subscriber
   * @dev Will cause the server to terminate if this was the last connection
   */
  private removeSubscriber(subscriberToRemove: WebSocket) {
    this.logToPublishers("Subscriber disconnected", "connections");

    this.subscribers = this.subscribers.filter(
      subscriber => subscriber !== subscriberToRemove
    );

    if (this.subscribers.length === 0) {
      this.resetReadyState();
    }

    this.terminateIfNoConnections();
  }

  /**
   * Add a publisher and set up message listeners to process their requests
   */
  private addPublisher(newPublisher: WebSocket) {
    this.logToPublishers("Publisher connected", "connections");

    newPublisher.on("message", (data: WebSocket.Data) => {
      this.processRequest(newPublisher, data, this.subscribers);
    });

    this.publishers.push(newPublisher);
  }

  /**
   * Remove a publisher and their corresponding requests
   * @dev Will cause the server to terminate if this was the last connection
   */
  private removePublisher(publisherToRemove: WebSocket) {
    this.logToPublishers("Publisher disconnected", "connections");

    this.publishers = this.publishers.filter(
      publisher => publisher !== publisherToRemove
    );

    this.clearRequestsForPublisher(publisherToRemove);
    this.terminateIfNoConnections();
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

  private resetReadyState() {
    this.readyPromise = new Promise(
      (resolve => {
        this.resolveReadyPromise = resolve;
      }).bind(this)
    );
  }
}
