import {
  DashboardMessageBusClientOptions,
  SendOptions,
  SubscriptionOptions
} from "./types";
import {
  createMessage,
  Message,
  Response
} from "@truffle/dashboard-message-bus-common";

import { DashboardMessageBusConnection } from "./connection";
import delay from "delay";
import debugModule from "debug";
import {
  DashboardMessageBusSubscription,
  PublishMessageLifecycle
} from "./lifecycle";
import { waitForOutstandingPromises } from "@truffle/promise-tracker";

const debug = debugModule(`dashboard-message-bus-client:client`);

export class DashboardMessageBusClient {
  private _options: DashboardMessageBusClientOptions;

  private _publishConnection: DashboardMessageBusConnection;
  private _subscribeConnection: DashboardMessageBusConnection;
  private _subscriptions: DashboardMessageBusSubscription<Message>[] = [];

  get options(): DashboardMessageBusClientOptions {
    return { ...this._options };
  }

  constructor(options: Partial<DashboardMessageBusClientOptions>) {
    this._options = {
      host: "localhost",
      port: 24012,
      pathPrefix: "/",
      maxRetries: 1,
      retryDelayMsec: 100,
      ...(options ?? {})
    };

    const { host, port, pathPrefix } = this._options;
    this._publishConnection = new DashboardMessageBusConnection({
      host,
      port,
      connectionType: "publish",
      pathPrefix
    });

    this._subscribeConnection = new DashboardMessageBusConnection({
      host,
      port,
      connectionType: "subscribe",
      pathPrefix
    });

    this._subscribeConnection.on("message", this._messageHandler.bind(this));
  }

  async ready() {
    await this._withRetriesAsync(async () => {
      Promise.all([
        this._publishConnection.connect(),
        this._subscribeConnection.connect()
      ]);
    });
  }

  async publish<MessageType extends Message, ResponseType extends Response>(
    options: SendOptions
  ): Promise<PublishMessageLifecycle<MessageType, ResponseType>> {
    const { type, payload } = options;
    let message = createMessage(type, payload);
    try {
      await this.ready();

      const lifecycle = new PublishMessageLifecycle({
        message,
        connection: this._publishConnection
      });

      return await this._withRetriesAsync(
        (async () => {
          debug("publisher sending message %o", message);
          await this._publishConnection.send(message);
          return lifecycle;
        }).bind(this)
      );
    } catch (err) {
      debug("sending message %o failed due to error %s", message, err);
      throw err;
    }
  }

  subscribe<MessageType extends Message>(
    options: SubscriptionOptions
  ): DashboardMessageBusSubscription<MessageType> {
    const subscription = new DashboardMessageBusSubscription<MessageType>(
      options
    );
    this._subscriptions.push(subscription);
    return subscription;
  }

  async close(force: boolean = false): Promise<void> {
    if (!force) {
      await this.waitForOutstandingPromises();
    }

    this._subscriptions.map(sub => sub._end());
    this._subscriptions = [];
    await Promise.all([
      this._subscribeConnection.close(),
      this._publishConnection.close()
    ]);
  }

  async waitForOutstandingPromises(): Promise<void> {
    await waitForOutstandingPromises({ target: this });
    return;
  }

  private _messageHandler(message: Message) {
    this._subscriptions.map(sub =>
      sub._evaluateMessage({ message, connection: this._subscribeConnection })
    );
  }

  private async _withRetriesAsync(f: Function) {
    const { maxRetries, retryDelayMsec } = this._options;

    for (let tryCount = 0; tryCount <= maxRetries; tryCount++) {
      try {
        const result = f.call(this);
        if (result.then) {
          // ensure any promise rejections are handled here so we count them as
          // failures to retry
          return await result;
        } else {
          return result;
        }
      } catch (err) {
        if (tryCount < maxRetries) {
          debug(
            "Attempt failed, %s of %s attempts remaining, delaying %s msec before retrying.",
            maxRetries - tryCount,
            maxRetries + 1,
            retryDelayMsec
          );
          await delay(retryDelayMsec);
          debug("Retrying failed operation now");
        } else {
          debug("Operation failed after %s attempts", tryCount);
          throw err;
        }
      }
    }
  }
}
