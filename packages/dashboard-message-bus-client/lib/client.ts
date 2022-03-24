import {
  DashboardMessageBusClientOptions,
  SendOptions,
  ResolvedDashboardMessageBusClientOptions,
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

const debug = debugModule(`dashboard-message-bus-client:client`);

export class DashboardMessageBusClient {
  private _options: ResolvedDashboardMessageBusClientOptions;

  private _publishConnection: DashboardMessageBusConnection;
  private _subscribeConnection: DashboardMessageBusConnection;
  private _subscriptions: DashboardMessageBusSubscription<Message>[] = [];

  public get options(): ResolvedDashboardMessageBusClientOptions {
    return { ...this._options };
  }

  public constructor(options: DashboardMessageBusClientOptions) {
    this._options = {
      host: "localhost",
      port: 24012,
      maxRetries: 4,
      retryDelayMsec: 1000,
      ...(options ?? {})
    };

    const { host, port, publishPort, subscribePort } = this._options;
    this._publishConnection = new DashboardMessageBusConnection({
      host,
      port,
      publishPort,
      connectionType: "publish"
    });

    this._subscribeConnection = new DashboardMessageBusConnection({
      host,
      port,
      subscribePort,
      connectionType: "subscribe"
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

  async close(): Promise<void> {
    this._subscriptions.map(sub => sub._end());
    this._subscriptions = [];
    await Promise.all([
      this._subscribeConnection.close(),
      this._publishConnection.close()
    ]);
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

export class TaskTrackingDashboardMessageBusClient extends DashboardMessageBusClient {
  private static _singletonInstance: TaskTrackingDashboardMessageBusClient | null;
  private _outstandingTasks: Map<Promise<any>, true> = new Map<
    Promise<any>,
    true
  >();

  public constructor(options: DashboardMessageBusClientOptions) {
    super(options);
  }

  static getSingletonInstance(options: DashboardMessageBusClientOptions) {
    if (!TaskTrackingDashboardMessageBusClient._singletonInstance) {
      const instanceProxyHandler: ProxyHandler<TaskTrackingDashboardMessageBusClient> =
        {
          get: (target: any, propertyName) => {
            const prop: any = target[propertyName];

            if (typeof prop === "function") {
              return target._wrapFunction(prop);
            }
            return prop;
          }
        };

      const constructorProxyHandler: ProxyHandler<
        typeof TaskTrackingDashboardMessageBusClient
      > = {
        construct: (target, args) => {
          return new Proxy(
            new TaskTrackingDashboardMessageBusClient(args[0]),
            instanceProxyHandler
          );
        }
      };

      const ProxiedDashboardMessageBusClient = new Proxy(
        TaskTrackingDashboardMessageBusClient,
        constructorProxyHandler
      );

      TaskTrackingDashboardMessageBusClient._singletonInstance =
        new ProxiedDashboardMessageBusClient(options);
    }

    return TaskTrackingDashboardMessageBusClient._singletonInstance;
  }

  async waitForOutstandingTasks(): Promise<void> {
    await Promise.all(this._outstandingTasks);
  }

  private _wrapFunction(f: Function): (...args: any[]) => Promise<unknown> {
    return ((...args: any[]) => {
      const returnValue = f.call(this, ...args);

      if (typeof returnValue.then === "function") {
        this._outstandingTasks.set(returnValue, true);

        return returnValue
          .then((val: Promise<unknown>) => {
            try {
              return val;
            } finally {
              this._outstandingTasks.delete(returnValue);
            }
          })
          .catch((err: any) => {
            try {
              throw err;
            } finally {
              this._outstandingTasks.delete(returnValue);
            }
          });
      }
      return returnValue;
    }).bind(this);
  }
}
