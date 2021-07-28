import axios from "axios";
import delay from "delay";
import WebSocket from "ws";

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

export const getMessageBusPort = async (dashboardPort: number, retries = 5, tryCount = 1) => {
  try {
    const { data } = await axios.get(`http://localhost:${dashboardPort}/ports`);
    return data.messageBusRequestsPort;
  } catch {
    if (tryCount === retries) {
      throw new Error(`Could not start or connect to dashboard at ${dashboardPort}`);
    }
    await delay(1000);
    return await getMessageBusPort(dashboardPort, retries, tryCount + 1);
  }
};
