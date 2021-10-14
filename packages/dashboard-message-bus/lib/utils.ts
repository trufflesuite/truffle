import WebSocket from "isomorphic-ws";
import { Message, PortsConfig } from "./types";
import any from "promise.any";
import delay from "delay";
import axios from "axios";

any.shim();

export const jsonToBase64 = (json: any) => {
  const stringifiedJson = JSON.stringify(json);
  const buffer = Buffer.from(stringifiedJson);
  const base64 = buffer.toString("base64");

  return base64;
};

export const base64ToJson = (base64: string) => {
  const buffer = Buffer.from(base64, "base64");
  const stringifiedJson = buffer.toString("utf8");
  const json = JSON.parse(stringifiedJson);

  return json;
};

export const createMessage = (type: string, payload: any): Message => {
  const id = Math.random();
  return { id, type, payload };
};

export const broadcastAndDisregard = (
  sockets: WebSocket[],
  message: Message
) => {
  const encodedMessage = jsonToBase64(message);
  sockets.forEach(socket => {
    socket.send(encodedMessage);
  });
};

export const broadcastAndAwaitFirst = async (
  sockets: WebSocket[],
  message: Message
) => {
  const promises = sockets.map(socket => sendAndAwait(socket, message));
  const result = await Promise.any(promises);
  return result;
};

export const sendAndAwait = (socket: WebSocket, message: Message) => {
  return new Promise<any>((resolve, reject) => {
    socket.addEventListener("message", (event: WebSocket.MessageEvent) => {
      if (typeof event.data !== "string") return;
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
  retries: number = 50,
  tryCount: number = 1
): Promise<WebSocket> => {
  try {
    return await connectToMessageBus(port, host);
  } catch (e) {
    if (tryCount === retries) throw e;
    await delay(1000);
    return await connectToMessageBusWithRetries(
      port,
      host,
      retries,
      tryCount + 1
    );
  }
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
  retries: number = 5,
  tryCount: number = 1
): Promise<PortsConfig> => {
  try {
    const { data } = await axios.get(
      `http://${dashboardHost}:${dashboardPort}/ports`
    );
    return data;
  } catch {
    if (tryCount === retries) {
      throw new Error(
        `Could not connect to dashboard at http://${dashboardHost}:${dashboardPort}/ports`
      );
    }
    await delay(1000);
    return await getMessageBusPorts(
      dashboardPort,
      dashboardHost,
      retries,
      tryCount + 1
    );
  }
};
