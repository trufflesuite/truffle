import { spawn } from "child_process";
import delay from "delay";
import { JSONRPCRequestPayload } from "ethereum-protocol";
import WebSocket from "ws";

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

export const runningJest = () => {
  return process.env.JEST_WORKER_ID !== undefined;
};

export const sendAndAwait = (socket: WebSocket, payload: JSONRPCRequestPayload) => {
  const message = {
    id: Date.now(),
    payload
  };

  return new Promise<any>((resolve, reject) => {
    socket.on("message", (data: WebSocket.Data) => {
      if (typeof data !== "string") return;
      const response = base64ToJson(data);

      if (response.id !== message.id) return;
      resolve(response.payload);
    });

    // TODO: Need to check that the error corresponds to the sent message?
    socket.on("error", (error: Error) => {
      reject(error);
    });

    socket.on("close", (code: number, reason: string) => {
      reject(new Error(reason));
    });

    const encodedMessage = jsonToBase64(message);
    socket.send(encodedMessage);
  });
};

export const startWebServer = (port: number) => {
  const webServerPath = `${__dirname}/web-server`;

  const executable = runningJest() ? "ts-node" : "node";

  return spawn(executable, [webServerPath, String(port)], {
    detached: true,
    stdio: "ignore"
  });
};

export const startFrontend = () => {
  return spawn("node", ["./node_modules/react-scripts/scripts/start.js"], {
    detached: true,
    stdio: "ignore",
    // TODO: Make this path relative
    cwd: "/Users/rosco/browser-provider-frontend"
  });
};

export const connectToWebServerWithRetries = async (port: number, retries = 50) => {
  for (let tryCount = 0; tryCount < retries; tryCount++) {
    try {
      return await connectToWebServer(port);
    } catch (e) {
      if (tryCount === retries) throw e;
      await delay(1000);
    }
  }
};

export const connectToWebServer = (port: number) => {
  const socket = new WebSocket(`ws://localhost:${port}`);

  return new Promise<WebSocket>((resolve, reject) => {
    socket.on("open", () => resolve(socket));
    socket.on("error", reject);
  });
};
