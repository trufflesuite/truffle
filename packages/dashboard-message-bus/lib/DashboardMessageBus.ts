import WebSocket from "isomorphic-ws";
import { EventEmitter } from "events";
import { parse } from "url";
import {
  base64ToJson,
  createMessage,
  jsonToBase64
} from "@truffle/dashboard-message-bus-common";

import { broadcastAndAwaitFirst, broadcastAndDisregard } from "./utils";
import { promisify } from "util";
import type { Server } from "http";

interface UnfulfilledRequest {
  publisher: WebSocket;
  data: WebSocket.Data;
}

export interface DashboardMessageBusOptions {
  /**
   * An array of {@link Server} instances that will be used to create the
   * websocket server instances that the message bus will listen on
   */
  httpServers: Server[];

  /**
   * The prefix for the HTTP path that the message bus will listen on (defaults
   * to "/")
   */
  pathPrefix?: string;
}

export class DashboardMessageBus extends EventEmitter {
  public readonly publishPath: string;
  public readonly subscribePath: string;

  private httpServers: Server[];

  private publishServer: WebSocket.Server;
  private subscribeServer: WebSocket.Server;
  private publishers: WebSocket[] = [];
  private subscribers: WebSocket[] = [];
  private readyPromise: Promise<void>;
  private resolveReadyPromise: () => void;

  private unfulfilledRequests: Map<string, UnfulfilledRequest> = new Map([]);

  constructor(options: DashboardMessageBusOptions) {
    super();

    this.httpServers = options.httpServers;

    let pathPrefix = options.pathPrefix ?? "/";

    // ensure pathPrefix always starts with a leading slash
    if (!pathPrefix.startsWith("/")) {
      pathPrefix = `/${pathPrefix}`;
    }

    // ensure pathPrefix always ends with a trailing slash
    if (!pathPrefix.endsWith("/")) {
      pathPrefix = `${pathPrefix}/`;
    }

    this.subscribePath = pathPrefix + "subscribe";
    this.publishPath = pathPrefix + "publish";

    // necessary to make it so that we can access properties of this class when
    // handling HTTP upgrade events
    this.handleHttpUpgrade = this.handleHttpUpgrade.bind(this);

    this.resetReadyState();
  }

  /**
   * Start the DashboardMessageBus
   * @dev This starts separate websocket servers for subscribers/publishers
   */
  async start() {
    if (this.subscribeServer && this.publishServer) {
      return;
    }

    this.subscribeServer = new WebSocket.Server({ noServer: true });
    this.publishServer = new WebSocket.Server({ noServer: true });

    this.subscribeServer.on("connection", (newSubscriber: WebSocket) => {
      newSubscriber.once("close", () => {
        this.removeSubscriber(newSubscriber);
      });

      // Require the subscriber to send a message *first* before being added
      newSubscriber.once("message", () => this.addSubscriber(newSubscriber));
    });

    this.publishServer.on("connection", (newPublisher: WebSocket) => {
      newPublisher.once("close", () => {
        this.removePublisher(newPublisher);
      });

      this.addPublisher(newPublisher);
    });

    this.httpServers.forEach(server => {
      server.on("upgrade", this.handleHttpUpgrade);
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
    this.httpServers.forEach(server => {
      server.off("upgrade", this.handleHttpUpgrade);
    });

    await Promise.all([
      promisify(this.publishServer.close.bind(this.publishServer))(),
      promisify(this.subscribeServer.close.bind(this.subscribeServer))()
    ]);
    this.emit("terminate");
  }

  private handleHttpUpgrade(request: any, socket: any, head: any) {
    const { pathname } = parse(request.url);

    if (pathname === this.subscribePath) {
      this.subscribeServer.handleUpgrade(request, socket, head, ws => {
        this.subscribeServer.emit("connection", ws, request);
      });
    } else if (pathname === this.publishPath) {
      this.publishServer.handleUpgrade(request, socket, head, ws => {
        this.publishServer.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
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
