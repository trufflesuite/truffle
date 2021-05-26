import delay from "delay";
import WebSocket from "ws";

export const connectToServerWithRetries = async (port: number, retries = 50, tryCount = 1): Promise<WebSocket> => {
  try {
    return await connectToServer(port);
  } catch (e) {
    if (tryCount === retries) throw e;
    await delay(1000);
    return await connectToServerWithRetries(port, retries, tryCount + 1);
  }
};

export const connectToServer = (port: number) => {
  const socket = new WebSocket(`ws://localhost:${port}`);

  return new Promise<WebSocket>((resolve, reject) => {
    socket.on("open", () => resolve(socket));
    socket.on("error", reject);
  });
};
