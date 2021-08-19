import { spawn } from "child_process";
import WebSocket from "ws";
import { Message } from "./types";
import any from 'promise.any';
import delay from "delay";

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

export const broadcastAndAwaitFirst = async (sockets: WebSocket[], message: Message) => {
  const promises = sockets.map(socket => sendAndAwait(socket, message));
  const result = await Promise.any(promises);
  return result;
};

export const sendAndAwait = (socket: WebSocket, message: Message) => {
  return new Promise<any>((resolve, reject) => {
    socket.on("message", (data: WebSocket.Data) => {
      if (typeof data !== "string") return;
      const response = base64ToJson(data);
      if (response.id !== message.id) return;
      resolve(response);
    });

    // TODO: Need to check that the error corresponds to the sent message?
    socket.on("error", (error: Error) => {
      reject(error);
    });

    socket.on("close", (code: number, reason: string) => {
      reject(new Error(`Socket connection closed with code '${code}' and reason '${reason}'`));
    });

    const encodedMessage = jsonToBase64(message);
    socket.send(encodedMessage);
  });
};

export const startMessageBus = (clientPort: number, dashboardPort: number) => {
  const serverPath = `${__dirname}/start-message-bus`;

  return spawn(
    "node",
    [serverPath, String(clientPort), String(dashboardPort)],
    {
      detached: true,
      stdio: "ignore"
    }
  );
};

export const connectToMessageBusWithRetries = async (port: number, retries = 50, tryCount = 1): Promise<WebSocket> => {
  try {
    return await connectToMessageBus(port);
  } catch (e) {
    if (tryCount === retries) throw e;
    await delay(1000);
    return await connectToMessageBusWithRetries(port, retries, tryCount + 1);
  }
};

export const connectToMessageBus = (port: number) => {
  const socket = new WebSocket(`ws://localhost:${port}`);

  return new Promise<WebSocket>((resolve, reject) => {
    socket.on("open", () => resolve(socket));
    socket.on("error", reject);
  });
};
