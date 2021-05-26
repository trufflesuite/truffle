import { spawn } from "child_process";
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

export const startServer = (providerPort: number, frontendPort: number) => {
  const webServerPath = `${__dirname}/start-server`;

  return spawn("node", [webServerPath, String(providerPort), String(frontendPort)], {
    detached: true,
    stdio: "ignore"
  });
};
