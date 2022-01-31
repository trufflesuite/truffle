import WebSocket, { ServerOptions } from "isomorphic-ws";
import type { Message, PortsConfig } from "./types";
import any from "promise.any";
import delay from "delay";
import axios from "axios";

any.shim();

/**
 * Convert any JS object or value to a base64 representation of it
 */
export const jsonToBase64 = (json: any) => {
  const stringifiedJson = JSON.stringify(json);
  const buffer = Buffer.from(stringifiedJson);
  const base64 = buffer.toString("base64");

  return base64;
};

/**
 * Convert the base64 representation of a JS object or value to its JS representation
 * @dev This is the reverse of `jsonToBase64` and is not expected to work with other base64 formats
 */
export const base64ToJson = (base64: string) => {
  const buffer = Buffer.from(base64, "base64");
  const stringifiedJson = buffer.toString("utf8");
  const json = JSON.parse(stringifiedJson);

  return json;
};

/**
 * Starts a websocket server and waits for it to be opened
 * @dev If you need to attach event listeners *before* the server connection opens,
 * do not use this function since it resolves *after* the connection is opened
 */
export const startWebSocketServer = (options: ServerOptions) => {
  return new Promise<WebSocket.Server>(resolve => {
    const server = new WebSocket.Server(options, () => resolve(server));
  });
};

export const createMessage = (type: string, payload: any): Message => {
  const id = Math.random();
  return { id, type, payload };
};

/**
 * Broadcast a message to multiple websocket connections and disregard them
 */
export const broadcastAndDisregard = (
  sockets: WebSocket[],
  message: Message
) => {
  const encodedMessage = jsonToBase64(message);
  sockets.forEach(socket => {
    socket.send(encodedMessage);
  });
};

/**
 * Broadcast a message to multuple websocket connections and return the first response
 */
export const broadcastAndAwaitFirst = async (
  sockets: WebSocket[],
  message: Message
) => {
  const promises = sockets.map(socket => sendAndAwait(socket, message));
  const result = await Promise.any(promises);
  return result;
};

/**
 * Send a message to a websocket connection and await a matching response
 * @dev Responses are matched by looking at received messages that match the ID of the sent message
 */
export const sendAndAwait = (socket: WebSocket, message: Message) => {
  return new Promise<any>((resolve, reject) => {
    socket.addEventListener("message", (event: WebSocket.MessageEvent) => {
      if (typeof event.data !== "string") {
        event.data = event.data.toString();
      }

      const response = base64ToJson(event.data);
      if (response.id !== message.id) return;
      resolve(response);
    });

    // TODO: Need to check that the error corresponds to the sent message?
    socket.addEventListener("error", (event: WebSocket.ErrorEvent) => {
      reject(event.error);
    });

    socket.addEventListener("close", (event: WebSocket.CloseEvent) => {
      reject(
        new Error(
          `Socket connection closed with code '${event.code}' and reason '${event.reason}'`
        )
      );
    });

    const encodedMessage = jsonToBase64(message);
    socket.send(encodedMessage);
  });
};

export const connectToMessageBusWithRetries = async (
  port: number,
  host: string = "localhost",
  retries: number = 50
): Promise<WebSocket> => {
  let error = new Error();
  for (let tryCount = 0; tryCount < retries; tryCount += 1) {
    try {
      return await connectToMessageBus(port, host);
    } catch (e) {
      error = e;
      await delay(1000);
    }
  }

  throw error;
};

export const connectToMessageBus = (
  port: number,
  host: string = "localhost"
) => {
  const socket = new WebSocket(`ws://${host}:${port}`);

  return new Promise<WebSocket>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(socket));
    socket.addEventListener("error", (event: WebSocket.ErrorEvent) =>
      reject(event.error)
    );
  });
};

export const getMessageBusPorts = async (
  dashboardPort: number,
  dashboardHost: string = "localhost",
  retries: number = 5
): Promise<PortsConfig> => {
  for (let tryCount = 0; tryCount < retries; tryCount += 1) {
    try {
      const { data } = await axios.get(
        `http://${dashboardHost}:${dashboardPort}/ports`
      );
      return data;
    } catch (e) {
      await delay(1000);
    }
  }

  throw new Error(
    `Could not connect to dashboard at http://${dashboardHost}:${dashboardPort}/ports`
  );
};
