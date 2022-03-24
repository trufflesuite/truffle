import WebSocket, { ServerOptions } from "isomorphic-ws";
import {
  Message,
  jsonToBase64,
  base64ToJson
} from "@truffle/dashboard-message-bus-common";
import any from "promise.any";

any.shim();

/**
 * Starts a websocket server and waits for it to be opened
 * @dev If you need to attach event listeners *before* the server connection opens,
 * do not use this function since it resolves *after* the connection is opened
 */
export const startWebSocketServer = (options: ServerOptions) => {
  return new Promise<WebSocket.Server>(resolve => {
    const server = new WebSocket.Server(options, () => {
      resolve(server);
    });
  });
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
    const handlers = {
      message: (event: WebSocket.MessageEvent) => {
        if (typeof event.data !== "string") {
          event.data = event.data.toString();
        }

        const response = base64ToJson(event.data);
        if (response.id !== message.id) return;
        resolve(response);
      },

      error: (event: WebSocket.ErrorEvent) => {
        reject(event.error);
      },

      close: (event: WebSocket.CloseEvent) => {
        reject(
          new Error(
            `Socket connection closed with code '${event.code}' and reason '${event.reason}'`
          )
        );
      }
    };

    for (const eventName of Object.keys(handlers)) {
      const origHandler = handlers[eventName];
      handlers[eventName] = (...args) => {
        for (const eventName of Object.keys(handlers)) {
          socket.removeEventListener(eventName, handlers[eventName]);
        }
        return origHandler(...args);
      };

      socket.addEventListener(eventName, handlers[eventName]);
    }

    const encodedMessage = jsonToBase64(message);
    socket.send(encodedMessage);
  });
};
