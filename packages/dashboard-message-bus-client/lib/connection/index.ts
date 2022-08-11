import WebSocket from "isomorphic-ws";

// must polyfill AbortController to use axios >=0.20.0, <=0.27.2 on node <= v14.x
import "../polyfill";
import axios from "axios";
import {
  base64ToJson,
  jsonToBase64,
  Message
} from "@truffle/dashboard-message-bus-common";

import debugModule from "debug";

import { MessageBusConnectionError } from "../errors";
import {
  DashboardMessageBusConnectionEvents,
  DashboardMessageBusConnectionOptions,
  SocketEventHandlerMap
} from "./types";

import { TypedEmitter } from "tiny-typed-emitter";

import { tracked } from "@truffle/promise-tracker";
import delay from "delay";

const debug = debugModule("dashboard-message-bus-client:connection");
const debugMessage = debugModule("dashboard-message-bus-client:message");

type HandlerFactory<T> = (
  resolve: (result: T) => void,
  reject: (err?: any) => void
) => SocketEventHandlerMap;

export class DashboardMessageBusConnection extends TypedEmitter<DashboardMessageBusConnectionEvents> {
  private _connectionType: "publish" | "subscribe";
  private _socket: WebSocket | undefined;
  private _host: string;
  private _port: number;
  private _publishPort: number | undefined;
  private _subscribePort: number | undefined;
  private _connecting: boolean;

  constructor({
    host,
    port,
    publishPort,
    subscribePort,
    connectionType: socketType
  }: DashboardMessageBusConnectionOptions) {
    super();
    this._host = host;
    this._port = port;
    this._publishPort = publishPort;
    this._subscribePort = subscribePort;
    this._connectionType = socketType;
  }

  get isConnected() {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  get isConnecting() {
    return this._socket && this._socket.readyState === WebSocket.CONNECTING;
  }

  get isClosing() {
    return this._socket && this._socket.readyState === WebSocket.CLOSING;
  }

  async connect(): Promise<void> {
    if (this._socket) {
      switch (this._socket.readyState) {
        case WebSocket.CONNECTING:
          debug(
            "connect: %s already attempting to connect (readyState switch)",
            this._connectionType
          );
          await delay(10);
          return this.connect();

        case WebSocket.OPEN:
          // we're already connected, just return
          debug("connect: %s already connected", this._connectionType);
          return;

        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          debug(
            "connect: %s was previously connected but has been closed",
            this._connectionType
          );
          // already closed or on our way there, so we'll just recreate it in a
          // moment
          delete this._socket;
      }
    }

    try {
      if (this._connecting) {
        debug(
          "connect: %s already attempting to connect (_connecting flag)",
          this._connectionType
        );
        await delay(10);
        return this.connect();
      }

      this._connecting = true;

      const port = await this._getMessageBusPort();

      const url = `ws://${this._host}:${port}`;

      debug(
        "connect: %s is attempting to connect to %s",
        this._connectionType,
        url
      );

      this._socket = new WebSocket(url);

      this._socket?.addEventListener(
        "message",
        ((event: WebSocket.MessageEvent) => {
          if (typeof event.data !== "string") {
            event.data = event.data.toString();
          }

          const message = base64ToJson(event.data);
          debugMessage(
            "%s connection received message %o",
            this._connectionType,
            message
          );
          this.emit("message", message);
        }).bind(this)
      );

      // connecting

      // we now have a socket that's in the process of opening, so return a
      // promise that resolves when it opens, or fails to open
      const connectPromise = this._createEventWrapperPromise<void>(
        (resolve, reject) => {
          return {
            open: () => {
              debug(
                "connect: %s connection succeeded to url %s",
                this._connectionType,
                this._socket?.url
              );
              if (this._connectionType === "subscribe") {
                this._socket?.send("ready");
              }
              resolve();
              this._connecting = false;
            },

            error: (event: WebSocket.ErrorEvent) => {
              debug(
                "connect: %s connection to url %s failed due to error %s",
                this._connectionType,
                this._socket?.url,
                event.error
              );
              reject(
                new MessageBusConnectionError({
                  message: event.error.message,
                  cause: event.error
                })
              );
              this._connecting = false;
            },

            close: (event: WebSocket.CloseEvent) => {
              debug(
                "connect: %s connection to url %s closed before successfully connecting due to code %s and reason %s",
                this._connectionType,
                this._socket?.url,
                event.code,
                event.reason
              );
              reject(
                new MessageBusConnectionError({
                  message: `Socket connection closed with code '${event.code}' and reason '${event.reason}'`
                })
              );
              this._connecting = false;
            }
          };
        }
      );

      let timedout = false;
      await Promise.race([
        connectPromise,
        async () => {
          await delay(350);
          timedout = true;
        }
      ]);
      if (timedout) {
        debug(
          "connect: %s connection to url %s timed out",
          this._connectionType,
          url
        );
      }
    } catch {
      this._connecting = false;
    }
  }

  async send(message: Message): Promise<void>;
  async send(data: string): Promise<void>;
  @tracked
  async send(dataOrMessage: string | Message): Promise<void> {
    const encodedMessage =
      typeof dataOrMessage === "string"
        ? dataOrMessage
        : jsonToBase64(dataOrMessage);

    await this.connect();

    debug(
      "send: %s connection sending %o",
      this._connectionType,
      base64ToJson(encodedMessage)
    );
    this._socket?.send(encodedMessage);
  }

  async close(): Promise<void> {
    if (!this._socket) {
      return;
    }

    if (this._socket.readyState <= WebSocket.CLOSING) {
      const promise = this._createEventWrapperPromise<void>(
        (resolve, reject) => {
          return {
            error: (event: WebSocket.ErrorEvent) => {
              reject(event.error);
            },
            close: () => {
              debug("%s connection closed", this._connectionType);
              resolve();
            }
          };
        }
      );

      this._socket.close();
      return promise;
    }
  }

  private async _getMessageBusPort(): Promise<number> {
    if (this._connectionType === "subscribe" && this._subscribePort) {
      return this._subscribePort;
    }

    if (this._connectionType === "publish" && this._publishPort) {
      return this._publishPort;
    }

    // otherwise, fetch it from the server
    try {
      debug(
        "_getMessageBusPort: %s connection attempting to fetch ports",
        this._connectionType
      );
      const { data } = await axios.get(
        `http://${this._host}:${this._port}/ports`,
        {
          timeout: 350
        }
      );

      const port =
        this._connectionType === "subscribe"
          ? data.subscribePort
          : data.publishPort;

      debug(
        "_getMessageBusPort: %s connection will use port %s",
        this._connectionType,
        port
      );

      return port;
    } catch (err) {
      debug(
        "_getMessageBusPort: failed fetching ports for %s connection due to error %s",
        this._connectionType,
        err
      );
      throw err;
    }
  }

  private _createEventWrapperPromise<T>(
    handlerFactory: HandlerFactory<T>
  ): Promise<T> {
    return new Promise<T>(
      ((resolve: (result: T) => void, reject: (err?: any) => void) => {
        this._registerEventHandlers(handlerFactory.call(this, resolve, reject));
      }).bind(this)
    );
  }

  private _registerEventHandlers(handlers: SocketEventHandlerMap) {
    let wrappedHandlers: SocketEventHandlerMap = {};
    for (const eventType in handlers) {
      wrappedHandlers[eventType] = ((...args: any[]) => {
        handlers[eventType].call(this, ...args);
        this._cleanUpEventHandlers(wrappedHandlers);
      }).bind(this);
      this._socket?.addEventListener(eventType, wrappedHandlers[eventType]);
    }
  }
  private _cleanUpEventHandlers(handlers: SocketEventHandlerMap) {
    for (const eventType in handlers) {
      this._socket?.removeEventListener(eventType, handlers[eventType]);
    }
  }
}
