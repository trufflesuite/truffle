import delay from "delay";

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
    socket.addEventListener("open", () => resolve(socket));
    socket.addEventListener("error", reject);
  });
};
